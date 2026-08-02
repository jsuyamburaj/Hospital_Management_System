package com.hms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** A single inventory line in the pharmacy - one row per medicine/batch. */
@Entity
@Table(name = "medicines")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String category;

    @Column(nullable = false)
    private Integer stock;

    // e.g. "tablets", "ml", "vials"
    private String unit;

    @Column(nullable = false)
    private Double price;

    private LocalDate expiryDate;

    @Builder.Default
    private Integer lowStockThreshold = 10;
}
