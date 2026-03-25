package in.parkos.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ParkOS — Vehicle Entity
 * Developed by: Alisha
 */
@Entity
@Table(name = "vehicles", indexes = {
    @Index(name = "idx_vehicle_plate", columnList = "plate_number"),
    @Index(name = "idx_vehicle_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "plate_number", nullable = false, length = 20)
    private String plateNumber;

    @Column(name = "owner_name", length = 100)
    private String ownerName;

    @Column(name = "owner_phone", length = 15)
    private String ownerPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false)
    private VehicleType vehicleType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User owner;

    @Column(name = "entry_time")
    private LocalDateTime entryTime;

    @Column(name = "exit_time")
    private LocalDateTime exitTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id")
    private ParkingSlot assignedSlot;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ParkingStatus status = ParkingStatus.PARKED;

    @Column(name = "total_amount")
    private Double totalAmount;

    @Column(name = "duration_minutes")
    private Long durationMinutes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum VehicleType { CAR, BIKE, TRUCK, EV }
    public enum ParkingStatus { PARKED, EXITED, RESERVED }
}
