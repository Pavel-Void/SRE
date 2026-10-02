package ru.psu.amyum.park.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SpotDto {
    private String title;
    private String location;
    private Integer spotId;
    private Integer parkingId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}