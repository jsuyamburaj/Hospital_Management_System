package com.hms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * A bill raised against a patient. Created and managed by billing staff,
 * viewable (read-only) by the patient it belongs to.
 */
@Entity
@Table(name = "billings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Billing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Double amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BillingStatus status = BillingStatus.UNPAID;

    @Column(nullable = false)
    private LocalDate date;

    private String description;

    // Optional link back to the completed treatment this bill covers
    private Long prescriptionId;

    // Null until the bill is paid. Set to ONLINE when the patient pays via
    // the in-app payment page, or OFFLINE when billing staff records a
    // manual/in-person payment.
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;
}
