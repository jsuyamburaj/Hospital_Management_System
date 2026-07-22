package com.hms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForgotPasswordResponse {
    private String message;
    // Demo-only: shown directly here because this build has no email server.
    // In production this must be emailed, never returned in the API response.
    private String temporaryPassword;
}
