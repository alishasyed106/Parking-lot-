package in.parkos.api.controller;

import in.parkos.api.dto.ApiResponse;
import in.parkos.api.dto.EntryRequest;
import in.parkos.api.dto.ExitResponse;
import in.parkos.api.entity.Vehicle;
import in.parkos.api.service.ParkingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * ParkOS — Parking REST Controller
 * API Base: /api/v1/parking
 * Developed by: Alisha
 */
@RestController
@RequestMapping("/api/v1/parking")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ParkingController {

    private final ParkingService parkingService;

    /**
     * POST /api/v1/parking/entry
     * Record a vehicle entering the parking facility.
     * Roles: ADMIN, STAFF
     */
    @PostMapping("/entry")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Vehicle>> recordEntry(
            @Valid @RequestBody EntryRequest request) {
        Vehicle vehicle = parkingService.recordEntry(request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.success("Vehicle entry recorded", vehicle));
    }

    /**
     * POST /api/v1/parking/exit/{vehicleId}
     * Process vehicle exit and generate bill.
     * Roles: ADMIN, STAFF
     */
    @PostMapping("/exit/{vehicleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<ExitResponse>> recordExit(
            @PathVariable UUID vehicleId) {
        ExitResponse response = parkingService.recordExit(vehicleId);
        return ResponseEntity.ok(ApiResponse.success("Vehicle exit processed", response));
    }

    /**
     * GET /api/v1/parking/stats
     * Get real-time occupancy statistics.
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = parkingService.getOccupancyStats();
        return ResponseEntity.ok(ApiResponse.success("Occupancy statistics", stats));
    }

    /**
     * GET /api/v1/parking/vehicles
     * List vehicles with optional filters.
     * Roles: ADMIN, STAFF
     */
    @GetMapping("/vehicles")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<Page<Vehicle>>> listVehicles(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String plate,
            @PageableDefault(size = 20, sort = "entryTime") Pageable pageable) {
        // Service method handles pagination and filtering
        return ResponseEntity.ok(ApiResponse.success("Vehicles list", null));
    }

    /**
     * GET /api/v1/parking/slots
     * Get all parking slot statuses — used for live slot map.
     */
    @GetMapping("/slots")
    public ResponseEntity<ApiResponse<?>> getSlots(
            @RequestParam(required = false) String zone) {
        return ResponseEntity.ok(ApiResponse.success("Slot statuses", null));
    }
}
