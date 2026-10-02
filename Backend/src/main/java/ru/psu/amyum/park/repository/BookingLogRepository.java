package ru.psu.amyum.park.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.psu.amyum.park.model.BookingLog;
import java.util.List;

public interface BookingLogRepository extends JpaRepository<BookingLog, Integer> {
    List<BookingLog> findByPlaceNumberAndParkingIdOrderByBookedAtDesc(Integer placeNumber, Integer parkingId);
    List<BookingLog> findByUserId(int userId);

}
