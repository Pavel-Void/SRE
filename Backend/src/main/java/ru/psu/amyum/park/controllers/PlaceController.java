package ru.psu.amyum.park.controllers;

import org.springframework.web.bind.annotation.*;
import ru.psu.amyum.park.model.Place;
import ru.psu.amyum.park.service.PlaceService;
import ru.psu.amyum.park.dto.Spot;
import ru.psu.amyum.park.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.crossstore.ChangeSetPersister;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class PlaceController {
    private final PlaceService placeService;
    private final UserService userService;

    public PlaceController(PlaceService placeService, UserService userService) {
        this.placeService = placeService;
        this.userService = userService;
    }

    @GetMapping("/spotsForMapList")
    public List<Spot> getSpotsForMapList(@RequestParam Integer parkingId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        int userId;
        try {
            userId = userService.getUserByEmail(email).getId();
        } catch (ChangeSetPersister.NotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
        }

        List<Place> places = placeService.findByParkingId(parkingId);
        return places.stream()
                .sorted(Comparator.comparing(Place::getId))
                .map(place -> {
                    String isOccupied;
                    if (place.isOccupied()) {
                        if (place.getUserId() != null && place.getUserId().equals(userId)) {
                            isOccupied = "mine";
                        } else {
                            isOccupied = "occupied";
                        }
                    } else {
                        isOccupied = "free";
                    }
                    return new Spot(
                            place.getId(),
                            isOccupied,
                            place.getParkingEndTime()
                    );
                })
                .collect(Collectors.toList());
    }
}