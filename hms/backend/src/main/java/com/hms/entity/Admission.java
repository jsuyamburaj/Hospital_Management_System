package com.hms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** Tracks a patient's inpatient stay (with ward/room) or an outpatient visit record. */
@Entity
@Table(name = "admissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Admission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdmissionType type;

    // Only meaningful for INPATIENT
    private String ward;
    private String roomNumber;

    @Column(nullable = false)
    private LocalDate admissionDate;

    private LocalDate dischargeDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AdmissionStatus status = AdmissionStatus.ADMITTED;

    private String reason;
}
