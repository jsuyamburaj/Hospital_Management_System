package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Used only by ADMIN's "Add Patient" form. If email + password are both
 * provided, a linked User login account (role = PATIENT) is created
 * alongside the Patient profile. If either is left blank, the Patient
 * profile is created without a login (can be linked later).
 */
@Data
public class PatientCreateRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private Integer age;
    private String disease;
    private Long doctorId;
    private String email;
    private String phone;

    // Plain-text password from the admin form; hashed before storage, never persisted as-is.
    private String password;
}
