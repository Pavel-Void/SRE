package ru.psu.amyum.park;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ParkPsuApplication {

	public static void main(String[] args) {
		SpringApplication.run(ParkPsuApplication.class, args);
	}
}
