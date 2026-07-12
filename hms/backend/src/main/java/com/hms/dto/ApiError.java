package com.hms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Uniform error shape returned to the frontend so js/script.js can rely on
 * a single `message` field regardless of which endpoint failed.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiError {
    private Instant timestamp = Instant.now();
    private int status;
    private String message;

    public ApiError(int status, String message) {
        this.status = status;
        this.message = message;
    }
}
