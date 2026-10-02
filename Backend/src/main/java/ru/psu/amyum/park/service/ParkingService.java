package ru.psu.amyum.park.service;

import org.springframework.stereotype.Service;
import ru.psu.amyum.park.model.Parking;
import ru.psu.amyum.park.repository.ParkingRepository;

import java.util.List;

@Service
public class ParkingService {

    private final ParkingRepository parkingRepository;

    public ParkingService(ParkingRepository parkingRepository) {
        this.parkingRepository = parkingRepository;
    }
    public List<Parking> findAll() {
        return parkingRepository.findAll();
    }
}