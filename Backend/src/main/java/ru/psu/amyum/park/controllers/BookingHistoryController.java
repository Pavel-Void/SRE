package ru.psu.amyum.park.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.psu.amyum.park.dto.SpotDto;
import ru.psu.amyum.park.security.CustomUserDetails;
import ru.psu.amyum.park.service.UserSpotService;

import java.util.List;

@RestController
@RequestMapping(path = "/api/user_profile")
@RequiredArgsConstructor
public class BookingHistoryController {

    private final UserSpotService userSpotService;

    @GetMapping("/bookingLogs")
    public List<SpotDto> getAllUserSpots(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return userSpotService.getAllUserSpots(userDetails.getId());
    }
}
