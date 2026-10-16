package com.hms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * A booking request from a patient to see a specific doctor on a given date.
 * Admin/doctor moves it through PENDING -> APPROVED/REJECTED -> COMPLETED.
 */
@Entity
@Table(name = "appointments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorId;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.PENDING;

    private String reason;

    // Specific time slot (e.g. "10:00 AM", "02:30 PM")
    private String timeSlot;

    // Set true by Reception when the patient physically arrives for the visit
    @Builder.Default
    private boolean checkedIn = false;
}
