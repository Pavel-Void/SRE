package ru.psu.amyum.park.service.impl;

import org.springframework.stereotype.Service;
import ru.psu.amyum.park.model.Place;
import ru.psu.amyum.park.repository.PlaceRepository;
import ru.psu.amyum.park.service.PlaceService;

import java.util.List;

@Service
public class PlaceServiceImpl implements PlaceService {
    private final PlaceRepository placeRepository;

    public PlaceServiceImpl(PlaceRepository placeRepository) {
        this.placeRepository = placeRepository;
    }

    @Override
    public List<Place> findByUserId(Integer userId) {
        return placeRepository.findAllByUserId(userId);
    }

    @Override
    public List<Place> findByParkingId(Integer parkingId) {
        return placeRepository.findAllById_ParkingId(parkingId);
    }
}