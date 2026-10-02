package ru.psu.amyum.park.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.sql.Timestamp;

@Setter
@Getter
@Entity
@Table(name = "places")
public class Place {
    @EmbeddedId
    private PlaceId id;
    @Column(name = "is_occupied")
    private Boolean isOccupied;
    @Column(name = "user_id")
    private Integer userId;
    @Column(name = "booking_time")
    private Timestamp bookingTime;
    @Column(name = "parking_end_time")
    private Timestamp parkingEndTime;

    public Place(PlaceId id, Boolean isOccupied, Integer userId, Timestamp bookingTime, Timestamp parkingEndTime) {
        this.id = id;
        this.isOccupied = isOccupied;
        this.userId = userId;
        this.bookingTime = bookingTime;
        this.parkingEndTime = parkingEndTime;
    }

    public Place() {}

    public Integer getPlaceNumber() {
        return id.getPlaceNumber();
    }

    public void setPlaceNumber(Integer placeNumber) {
        id.setPlaceNumber(placeNumber);
    }

    public Integer getParkingId() {
        return id.getParkingId();
    }

    public void setParkingId(Integer parkingId) {
        id.setParkingId(parkingId);
    }

    public int getId() {
        return id.getPlaceNumber();
    }

    public boolean isOccupied() {
        return Boolean.TRUE.equals(isOccupied);
    }

}