package com.hms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** A single lab test order, from request through result. */
@Entity
@Table(name = "lab_tests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long doctorId;

    @Column(nullable = false)
    private String testName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private LabTestStatus status = LabTestStatus.ORDERED;

    @Column(nullable = false)
    private LocalDate orderedDate;

    private LocalDate completedDate;

    @Column(length = 2000)
    private String resultSummary;
}
