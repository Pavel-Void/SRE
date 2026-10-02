package ru.psu.amyum.park.controllers;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.psu.amyum.park.model.Parking;
import ru.psu.amyum.park.service.ParkingService;

import java.util.List;

@RestController
@RequestMapping(path = "/api/parkingList")
public class ParkingController {

    private final ParkingService parkingService;

    public ParkingController(ParkingService parkingService) {
        this.parkingService = parkingService;
    }

    @GetMapping
    public List<Parking> findAll() {
        return parkingService.findAll();
    }
}