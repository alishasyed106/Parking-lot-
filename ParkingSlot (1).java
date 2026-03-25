package in.parkos.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ParkOS — Parking Slot Entity
 * Developed by: Alisha
 */
@Entity
@Table(name = "parking_slots", indexes = {
    @Index(name = "idx_slot_status", columnList = "status"),
    @Index(name = "idx_slot_zone", columnList = "zone")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ParkingSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "slot_number", nullable = false, unique = true, length = 10)
    private String slotNumber;  // e.g. "A-01"

    @Column(name = "zone", nullable = false, length = 5)
    private String zone;  // A, B, C, D

    @Column(name = "floor_level")
    private Integer floorLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "slot_type")
    @Builder.Default
    private SlotType slotType = SlotType.STANDARD;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SlotStatus status = SlotStatus.AVAILABLE;

    @Column(name = "is_ev_charging")
    @Builder.Default
    private Boolean isEvCharging = false;

    @Column(name = "is_disabled_friendly")
    @Builder.Default
    private Boolean isDisabledFriendly = false;

    @Column(name = "facility_id")
    private UUID facilityId;

    @UpdateTimestamp
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    public enum SlotType  { STANDARD, COMPACT, OVERSIZED, EV, DISABLED }
    public enum SlotStatus { AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE }
}
