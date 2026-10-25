package ru.psu.amyum.park.controllers;

import org.springframework.data.crossstore.ChangeSetPersister;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.psu.amyum.park.metrics.ParkMetricsService;
import ru.psu.amyum.park.dto.BookingRequest;
import ru.psu.amyum.park.dto.CancelSpotRequest;
import ru.psu.amyum.park.service.BookingService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.psu.amyum.park.service.UserService;
import ru.psu.amyum.park.dto.BookingResponse;
import ru.psu.amyum.park.model.BookingLog;
import ru.psu.amyum.park.dto.BookedSpot;

import java.util.Map;
import java.util.stream.Collectors;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping(path = "/api")
public class BookingController {
    private final BookingService bookingService;
    private final UserService userService;
    private final ParkMetricsService parkMetricsService;

    public BookingController(BookingService bookingService, UserService userService, ParkMetricsService parkMetricsService) {
        this.bookingService = bookingService;
        this.userService = userService;
        this.parkMetricsService = parkMetricsService;
    }

    @PostMapping("/booking")
    public ResponseEntity<BookingResponse> bookPlace(@RequestBody BookingRequest request) throws ChangeSetPersister.NotFoundException {
        LocalTime startTime = LocalTime.parse(request.getStart_time());
        LocalDateTime startDateTime = LocalDateTime.of(request.getDate(), startTime);
        Timestamp bookingTime = Timestamp.valueOf(startDateTime);

        int placeId = request.getPlaceId();
        int parkingId = request.getParkingId();
        int parkingTime = request.getParking_time();

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        int userId = userService.getUserByEmail(email).getId();

        long startNanos = System.nanoTime();
        try {
            bookingService.bookPlace(placeId, parkingId, userId, bookingTime, parkingTime);
            parkMetricsService.recordBooking(parkingId, true);
            parkMetricsService.recordBookingDuration(System.nanoTime() - startNanos, true);
        } catch (Exception e) {
            parkMetricsService.recordBooking(parkingId, false);
            parkMetricsService.recordBookingDuration(System.nanoTime() - startNanos, false);
            throw e;
        }

        BookingResponse response = new BookingResponse(
                placeId,
                parkingId,
                request.getDate(),
                request.getStart_time(),
                parkingTime
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/bookedList")
    public ResponseEntity<List<BookedSpot>> getBookedList(
            @RequestParam("parkingId") Integer parkingId,
            @RequestParam("placeId") Integer placeId) {
        List<BookingLog> bookings = bookingService.getBookingsByPlaceAndParking(placeId, parkingId);

        List<BookedSpot> bookedSpots = bookings.stream()
                .filter(booking -> booking.getReleasedAt().after(Timestamp.valueOf(LocalDateTime.now())))
                .map(booking -> new BookedSpot(
                        booking.getBookedAt(),
                        booking.getReleasedAt()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(bookedSpots);
    }

    @PostMapping("/cancelBooking")
    public ResponseEntity<?> cancelBooking(@RequestBody CancelSpotRequest request) {
        try {
            bookingService.cancelBooking(
                    request.getParkingId(),
                    request.getSpotId(),
                    request.getStartTime()
            );
            parkMetricsService.recordCancellation(request.getParkingId(), "user_cancel");
            return ResponseEntity.ok(Map.of("message", "Booking cancelled successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
}
