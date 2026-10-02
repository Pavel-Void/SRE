package ru.psu.amyum.park.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.sql.Timestamp;

@Setter
@Getter
@Entity
@Table(name = "booking_logs")
public class BookingLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(name = "user_id")
    private Integer userId;
    @Column(name = "parking_id")
    private Integer parkingId;
    @Column(name = "place_number")
    private Integer placeNumber;
    @Column(name = "booked_at")
    private Timestamp bookedAt;
    @Column(name = "released_at")
    private Timestamp releasedAt;
    @Column(name = "activated")
    private Boolean activated;

    public BookingLog(Integer id, Integer userId, Integer parkingId, Integer placeNumber, Timestamp bookedAt, Timestamp releasedAt) {
        this.id = id;
        this.userId = userId;
        this.parkingId = parkingId;
        this.placeNumber = placeNumber;
        this.bookedAt = bookedAt;
        this.releasedAt = releasedAt;
    }

    public BookingLog() {}
}
