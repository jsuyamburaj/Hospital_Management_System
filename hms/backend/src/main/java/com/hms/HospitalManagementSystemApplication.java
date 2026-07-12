package com.hms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Hospital Management System backend.
 * Boots the embedded server, wires up JPA repositories, and applies
 * the Spring Security / JWT configuration found in the config + security packages.
 */
@SpringBootApplication
public class HospitalManagementSystemApplication {
    public static void main(String[] args) {
        SpringApplication.run(HospitalManagementSystemApplication.class, args);
    }
}
