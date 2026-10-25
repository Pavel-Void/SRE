package ru.psu.amyum.park.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.psu.amyum.park.model.Parking;
import ru.psu.amyum.park.model.Place;
import ru.psu.amyum.park.repository.ParkingRepository;
import ru.psu.amyum.park.repository.PlaceRepository;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class ParkMetricsService {

    private final MeterRegistry meterRegistry;
    private final ParkingRepository parkingRepository;
    private final PlaceRepository placeRepository;

    @PostConstruct
    public void init() {
        try {
            List<Parking> parkings = parkingRepository.findAll();
            for (Parking parking : parkings) {
                registerParkingGauges(parking.getId());
            }
        } catch (Exception ignored) {
        }
    }

    public synchronized void registerParkingGauges(int parkingId) {
        Gauge.builder("parking_spots_status", this, service -> service.getOccupiedCount(parkingId))
                .description("Current number of occupied parking spots")
                .tag("parking_id", String.valueOf(parkingId))
                .tag("state", "occupied")
                .register(meterRegistry);

        Gauge.builder("parking_spots_status", this, service -> service.getFreeCount(parkingId))
                .description("Current number of free parking spots")
                .tag("parking_id", String.valueOf(parkingId))
                .tag("state", "free")
                .register(meterRegistry);
    }

    public double getOccupiedCount(int parkingId) {
        try {
            List<Place> places = placeRepository.findAllById_ParkingId(parkingId);
            return places.stream().filter(p -> Boolean.TRUE.equals(p.getIsOccupied())).count();
        } catch (Exception e) {
            return 0.0;
        }
    }

    public double getFreeCount(int parkingId) {
        try {
            List<Place> places = placeRepository.findAllById_ParkingId(parkingId);
            return places.stream().filter(p -> !Boolean.TRUE.equals(p.getIsOccupied())).count();
        } catch (Exception e) {
            return 0.0;
        }
    }

    // Metric 1: Bookings counter
    public void recordBooking(int parkingId, boolean success) {
        Counter.builder("parking_bookings_total")
                .description("Total number of booking attempts")
                .tag("parking_id", String.valueOf(parkingId))
                .tag("status", success ? "success" : "failure")
                .register(meterRegistry)
                .increment();
    }

    // Metric 2: Cancellations counter
    public void recordCancellation(int parkingId, String reason) {
        Counter.builder("parking_booking_cancellations_total")
                .description("Total number of cancelled bookings")
                .tag("parking_id", String.valueOf(parkingId))
                .tag("reason", reason != null ? reason : "unknown")
                .register(meterRegistry)
                .increment();
    }

    // Metric 3: Authentication and registration attempts
    public void recordAuth(String action, String status) {
        Counter.builder("parking_auth_attempts_total")
                .description("Total number of authentication and registration attempts")
                .tag("action", action)
                .tag("status", status)
                .register(meterRegistry)
                .increment();
    }

    // Metric 5 (Bonus): Booking operation latency
    public void recordBookingDuration(long durationNanos, boolean success) {
        Timer.builder("parking_booking_duration_seconds")
                .description("Execution time of booking operations")
                .tag("status", success ? "success" : "error")
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }
}
