package ru.psu.amyum.park.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.psu.amyum.park.dto.SpotDto;
import ru.psu.amyum.park.model.BookingLog;
import ru.psu.amyum.park.repository.BookingLogRepository;
import ru.psu.amyum.park.repository.ParkingRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserSpotService {
    private final BookingLogRepository bookingLogRepository;
    private final ParkingRepository parkingRepository;

    public List<SpotDto> getUserSpots(int userId) {
        LocalDateTime now = LocalDateTime.now();
        List<BookingLog> bookings = bookingLogRepository.findByUserId(userId);
        return bookings.stream()
                .filter(log -> log.getReleasedAt() != null && log.getReleasedAt().toLocalDateTime().isAfter(now))
                .map(this::convertToSpotDto)
                .collect(Collectors.toList());
    }

    public List<SpotDto> getAllUserSpots(int userId) {
        List<BookingLog> bookings = bookingLogRepository.findByUserId(userId);
        return bookings.stream()
                .map(this::convertToSpotDto)
                .collect(Collectors.toList());
    }

    private SpotDto convertToSpotDto(BookingLog log) {
        SpotDto dto = new SpotDto();
        dto.setTitle(String.format("Место №%d", log.getPlaceNumber()));
        parkingRepository.findById(log.getParkingId())
                .ifPresent(parking -> dto.setLocation(parking.getLocation()));
        dto.setSpotId(log.getPlaceNumber());
        dto.setParkingId(log.getParkingId());
        dto.setStartTime(log.getBookedAt() != null ? log.getBookedAt().toLocalDateTime() : null);
        dto.setEndTime(log.getReleasedAt() != null ? log.getReleasedAt().toLocalDateTime() : null);
        return dto;
    }
}