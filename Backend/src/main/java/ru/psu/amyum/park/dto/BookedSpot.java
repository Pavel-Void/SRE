package ru.psu.amyum.park.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Getter
@Setter
public class BookedSpot {
    private Date startTime;
    private Date endTime;

    public BookedSpot(Date startTime, Date endTime) {
        this.startTime = startTime;
        this.endTime = endTime;
    }
}