package com.hms.repository;

import com.hms.entity.Admission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdmissionRepository extends JpaRepository<Admission, Long> {
    List<Admission> findByPatientId(Long patientId);
    List<Admission> findByDoctorId(Long doctorId);
}
