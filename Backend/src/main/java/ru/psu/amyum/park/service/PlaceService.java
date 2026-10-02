package ru.psu.amyum.park.service;

import ru.psu.amyum.park.model.Place;
import java.util.List;

public interface PlaceService {
    List<Place> findByUserId(Integer userId);
    List<Place> findByParkingId(Integer parkingId);
}