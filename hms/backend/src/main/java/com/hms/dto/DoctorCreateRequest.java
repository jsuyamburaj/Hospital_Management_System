package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Used only by ADMIN's "Add Doctor" form. If email + password are both
 * provided, a linked User login account (role = DOCTOR) is created
 * alongside the Doctor profile. If either is left blank, the Doctor
 * profile is created without a login (can be linked later).
 */
@Data
public class DoctorCreateRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Specialization is required")
    private String specialization;

    private String email;
    private String phone;

    // Plain-text password from the admin form; hashed before storage, never persisted as-is.
    private String password;
}
