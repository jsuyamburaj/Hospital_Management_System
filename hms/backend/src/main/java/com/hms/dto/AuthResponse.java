package com.hms.dto;

import com.hms.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Returned to the frontend after a successful login/register.
 * The frontend stores `token` in localStorage and uses `role` to redirect
 * to the right dashboard (admin.html / staff.html / dashboard.html).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private Long userId;
    private String name;
    private String email;
    private Role role;
}
