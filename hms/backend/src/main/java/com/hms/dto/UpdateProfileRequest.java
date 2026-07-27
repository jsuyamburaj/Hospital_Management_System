package com.hms.dto;

import lombok.Data;

/**
 * Self-service "edit my details" request. Name and email are intentionally
 * excluded — they're the account's identity/login and aren't user-editable
 * in this build. Only the fields relevant to the caller's role are applied:
 * PATIENT -> phone/age/disease, DOCTOR -> phone/specialization,
 * BILLING_STAFF -> phone.
 */
@Data
public class UpdateProfileRequest {
    private String phone;
    private Integer age;
    private String disease;
    private String specialization;
}
