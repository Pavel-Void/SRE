package ru.psu.amyum.park.dto;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class Spot {
    private int id;
    private String isOccupied; // "free", "occupied", "mine"
    private Timestamp parkingEndTime;

    public Spot(int id, String isOccupied, Timestamp parkingEndTime) {
        this.id = id;
        this.isOccupied = isOccupied;
        this.parkingEndTime = parkingEndTime;
    }
}