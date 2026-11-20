package ru.psu.amyum.park.controllers;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class VersionController {

    private final MeterRegistry meterRegistry;

    @Value("${app.version:v1.0.0}")
    private String version;

    @GetMapping(value = {"/", "/version", "/api/version"}, produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getVersion(HttpServletResponse response) {
        String host = System.getenv().getOrDefault("HOSTNAME", "unknown-pod");
        response.addHeader("X-App-Version", version);
        meterRegistry.counter("http_requests_total", "version", version).increment();
        return ResponseEntity.ok(String.format("Host: %s, Version: %s\n", host, version));
    }
}
