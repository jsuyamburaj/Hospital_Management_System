package com.hms.entity;

/**
 * The four roles recognized by the system. Stored as a STRING in the
 * database so values stay human-readable (see User#role).
 */
public enum Role {
    ADMIN,
    DOCTOR,
    BILLING_STAFF,
    PATIENT
}
