package ru.psu.amyum.park.repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import ru.psu.amyum.park.model.Place;
import ru.psu.amyum.park.model.PlaceId;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

public interface PlaceRepository extends CrudRepository<Place, PlaceId> {
    List<Place> findAllByUserId(Integer userId);
    List<Place> findAllById_ParkingId(Integer parkingId);
    Optional<Place> findById_PlaceNumberAndId_ParkingId(Integer placeNumber, Integer parkingId);

    @Modifying
    @Query("UPDATE Place p SET p.userId = NULL, p.isOccupied = false, p.bookingTime = NULL, p.parkingEndTime = NULL WHERE p.parkingEndTime <= :now")
    void releaseExpiredPlaces(Timestamp now);
}