package com.hms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Used by ADMIN's "Add Billing Staff" form. Unlike Patient/Doctor, billing
 * staff have no separate profile entity — they're just a User row with
 * role = BILLING_STAFF, so email + password are always required here.
 */
@Data
public class StaffCreateRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String phone;
}
