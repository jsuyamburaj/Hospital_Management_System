package com.hms.repository;

import com.hms.entity.Billing;
import com.hms.entity.BillingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillingRepository extends JpaRepository<Billing, Long> {
    List<Billing> findByPatientId(Long patientId);
    List<Billing> findByStatus(BillingStatus status);
}
