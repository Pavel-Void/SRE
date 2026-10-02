package ru.psu.amyum.park.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.psu.amyum.park.dto.SpotDto;
import ru.psu.amyum.park.security.CustomUserDetails;
import ru.psu.amyum.park.service.UserSpotService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SpotController {

    private final UserSpotService userSpotService;

    @GetMapping("/spotsList")
    public List<SpotDto> getUserSpots(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return userSpotService.getUserSpots(userDetails.getId());
    }
}