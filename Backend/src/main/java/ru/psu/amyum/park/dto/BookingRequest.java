package ru.psu.amyum.park.dto;


import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Setter
@Getter
public class BookingRequest {
    private Integer placeId;
    private Integer parkingId;
    private LocalDate date;
    private String start_time;
    private Integer parking_time;

    public BookingRequest(Integer placeId, Integer parkingId, LocalDate date, String start_time, Integer parking_time) {
        this.placeId = placeId;
        this.parkingId = parkingId;
        this.date = date;
        this.start_time = start_time;
        this.parking_time = parking_time;
    }

    public BookingRequest() {}

}
