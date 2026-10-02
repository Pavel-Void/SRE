package ru.psu.amyum.park.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;

@Setter
@Getter
@Embeddable
public class PlaceId implements Serializable {

    @Column(name = "place_number")
    private Integer placeNumber;

    @Column(name = "parking_id")
    private Integer parkingId;

    public PlaceId() {}

    public PlaceId(Integer placeNumber, Integer parkingId) {
        this.placeNumber = placeNumber;
        this.parkingId = parkingId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PlaceId)) return false;
        PlaceId that = (PlaceId) o;
        return Objects.equals(placeNumber, that.placeNumber) &&
                Objects.equals(parkingId, that.parkingId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(placeNumber, parkingId);
    }
}
