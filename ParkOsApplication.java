package in.parkos.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * ParkOS — Parking Management System
 * Backend: Java 21 + Spring Boot 3.2
 * Developed by: Alisha
 */
@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableScheduling
public class ParkOsApplication {
    public static void main(String[] args) {
        SpringApplication.run(ParkOsApplication.class, args);
    }
}
