package ru.psu.amyum.park.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.psu.amyum.park.repository.PlaceRepository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;

/**
 * Background worker component for periodic maintenance tasks (Factor 8: Concurrency).
 * Can be enabled/disabled via 'app.scheduling.enabled' to allow scaling web and worker processes independently.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class BookingScheduler {

    private static final Logger log = LoggerFactory.getLogger(BookingScheduler.class);

    private final PlaceRepository placeRepository;
    private final JdbcTemplate jdbcTemplate;

    public BookingScheduler(PlaceRepository placeRepository, JdbcTemplate jdbcTemplate) {
        this.placeRepository = placeRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void releaseExpiredPlaces() {
        log.debug("Running scheduled task: releaseExpiredPlaces");
        Timestamp now = Timestamp.from(Instant.now());
        placeRepository.releaseExpiredPlaces(now);
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void activateFutureBooking() {
        log.debug("Running scheduled task: activateFutureBooking");
        jdbcTemplate.query(
                "SELECT activate_future_booking(?)",
                ps -> ps.setTimestamp(1, Timestamp.valueOf(LocalDateTime.now())),
                rs -> {}
        );
    }
}
