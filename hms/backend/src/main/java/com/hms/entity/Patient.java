package com.hms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A patient profile. Linked to the login account via userId (role = PATIENT)
 * and, optionally, to an assigned doctor via doctorId.
 */
@Entity
@Table(name = "patients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private Integer age;

    private String disease;

    // Assigned doctor, may be null until admin assigns one
    private Long doctorId;

    // Link to the login account
    private Long userId;

    private String email;

    private String phone;
}
