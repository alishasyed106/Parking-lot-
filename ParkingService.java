package in.parkos.api.service;

import in.parkos.api.dto.EntryRequest;
import in.parkos.api.dto.ExitResponse;
import in.parkos.api.entity.ParkingSlot;
import in.parkos.api.entity.ParkingSlot.SlotStatus;
import in.parkos.api.entity.Vehicle;
import in.parkos.api.entity.Vehicle.ParkingStatus;
import in.parkos.api.entity.Vehicle.VehicleType;
import in.parkos.api.exception.NoSlotAvailableException;
import in.parkos.api.exception.VehicleAlreadyParkedException;
import in.parkos.api.repository.ParkingSlotRepository;
import in.parkos.api.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * ParkOS — Core Parking Service
 * Handles slot allocation, vehicle entry/exit, and billing
 * Developed by: Alisha
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ParkingService {

    private final VehicleRepository vehicleRepository;
    private final ParkingSlotRepository slotRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final BillingService billingService;

    // Hourly rates in INR
    private static final Map<VehicleType, Double> RATES = Map.of(
        VehicleType.CAR,   60.0,
        VehicleType.BIKE,  30.0,
        VehicleType.TRUCK, 120.0,
        VehicleType.EV,    50.0
    );

    /**
     * Records vehicle entry and allocates a parking slot.
     * Strategy: First Available in preferred zone, fallback to any zone.
     *
     * @param request EntryRequest DTO
     * @return saved Vehicle entity with assigned slot
     */
    @Transactional
    @CacheEvict(value = {"slot-availability", "occupancy-stats"}, allEntries = true)
    public Vehicle recordEntry(EntryRequest request) {
        // Guard: already parked?
        vehicleRepository.findByPlateNumberAndStatus(request.getPlateNumber(), ParkingStatus.PARKED)
            .ifPresent(v -> { throw new VehicleAlreadyParkedException(request.getPlateNumber()); });

        // Slot allocation
        ParkingSlot slot = allocateSlot(request.getPreferredZone(), request.getVehicleType());

        Vehicle vehicle = Vehicle.builder()
            .plateNumber(request.getPlateNumber().toUpperCase())
            .ownerName(request.getOwnerName())
            .ownerPhone(request.getOwnerPhone())
            .vehicleType(request.getVehicleType())
            .entryTime(LocalDateTime.now())
            .assignedSlot(slot)
            .status(ParkingStatus.PARKED)
            .build();

        // Mark slot occupied
        slot.setStatus(SlotStatus.OCCUPIED);
        slotRepository.save(slot);

        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("[ENTRY] {} → Slot {} at {}", saved.getPlateNumber(), slot.getSlotNumber(), saved.getEntryTime());

        // Publish event to Kafka for real-time dashboard
        kafkaTemplate.send("parking.events", "entry", Map.of(
            "vehicleId", saved.getId(),
            "plate", saved.getPlateNumber(),
            "slot", slot.getSlotNumber(),
            "timestamp", saved.getEntryTime().toString()
        ));

        return saved;
    }

    /**
     * Records vehicle exit, calculates duration and billing, frees slot.
     *
     * @param vehicleId UUID of the parked vehicle
     * @return ExitResponse with billing details
     */
    @Transactional
    @CacheEvict(value = {"slot-availability", "occupancy-stats"}, allEntries = true)
    public ExitResponse recordExit(UUID vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
            .orElseThrow(() -> new IllegalArgumentException("Vehicle not found: " + vehicleId));

        if (vehicle.getStatus() != ParkingStatus.PARKED) {
            throw new IllegalStateException("Vehicle is not currently parked");
        }

        LocalDateTime exitTime = LocalDateTime.now();
        Duration duration = Duration.between(vehicle.getEntryTime(), exitTime);
        long minutes = Math.max(duration.toMinutes(), 30); // Minimum 30 min charge
        double hours = Math.ceil(minutes / 60.0);
        double rate = RATES.getOrDefault(vehicle.getVehicleType(), 60.0);
        double amount = hours * rate;

        vehicle.setExitTime(exitTime);
        vehicle.setDurationMinutes(minutes);
        vehicle.setTotalAmount(amount);
        vehicle.setStatus(ParkingStatus.EXITED);

        // Free the slot
        ParkingSlot slot = vehicle.getAssignedSlot();
        if (slot != null) {
            slot.setStatus(SlotStatus.AVAILABLE);
            slotRepository.save(slot);
        }

        vehicleRepository.save(vehicle);
        log.info("[EXIT] {} | Duration: {}min | Amount: ₹{}", vehicle.getPlateNumber(), minutes, amount);

        // Publish exit event
        kafkaTemplate.send("parking.events", "exit", Map.of(
            "vehicleId", vehicle.getId(),
            "plate", vehicle.getPlateNumber(),
            "duration", minutes,
            "amount", amount,
            "timestamp", exitTime.toString()
        ));

        return ExitResponse.builder()
            .vehicleId(vehicleId)
            .plateNumber(vehicle.getPlateNumber())
            .slotNumber(slot != null ? slot.getSlotNumber() : "N/A")
            .entryTime(vehicle.getEntryTime())
            .exitTime(exitTime)
            .durationMinutes(minutes)
            .totalAmount(amount)
            .build();
    }

    /**
     * Find and allocate best available slot.
     * Priority: preferred zone → any available zone → throw if none
     */
    private ParkingSlot allocateSlot(String preferredZone, VehicleType vehicleType) {
        // 1. Try preferred zone first
        if (preferredZone != null && !preferredZone.isBlank()) {
            return slotRepository
                .findFirstByZoneAndStatusOrderBySlotNumberAsc(preferredZone, SlotStatus.AVAILABLE)
                .orElseGet(() -> findAnyAvailable(vehicleType));
        }
        return findAnyAvailable(vehicleType);
    }

    private ParkingSlot findAnyAvailable(VehicleType type) {
        // EV vehicles prefer EV slots
        if (type == VehicleType.EV) {
            return slotRepository.findFirstBySlotTypeAndStatusOrderBySlotNumberAsc(
                    ParkingSlot.SlotType.EV, SlotStatus.AVAILABLE)
                .orElseGet(() -> findGenericSlot());
        }
        return findGenericSlot();
    }

    private ParkingSlot findGenericSlot() {
        return slotRepository.findFirstByStatusOrderByZoneAscSlotNumberAsc(SlotStatus.AVAILABLE)
            .orElseThrow(() -> new NoSlotAvailableException("No parking slots available in any zone"));
    }

    @Cacheable("occupancy-stats")
    public Map<String, Object> getOccupancyStats() {
        long total = slotRepository.count();
        long occupied = slotRepository.countByStatus(SlotStatus.OCCUPIED);
        long available = slotRepository.countByStatus(SlotStatus.AVAILABLE);
        double rate = total > 0 ? (double) occupied / total * 100 : 0;
        return Map.of(
            "total", total,
            "occupied", occupied,
            "available", available,
            "occupancyRate", Math.round(rate * 10.0) / 10.0
        );
    }
}
