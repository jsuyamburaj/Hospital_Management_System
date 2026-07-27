package com.hms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Created when a doctor marks an appointment as completed. Holds the
 * prescribed medicines/notes, and is what billing staff use to know a
 * patient is ready to be billed.
 */
@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long appointmentId;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorId;

    @Column(nullable = false, length = 2000)
    private String medicines;

    @Column(length = 2000)
    private String notes;

    // Set true once billing staff have created a bill for this prescription
    @Builder.Default
    private boolean billed = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
