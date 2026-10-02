package ru.psu.amyum.park.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.psu.amyum.park.model.Parking;

public interface ParkingRepository extends JpaRepository<Parking, Integer> {

}
