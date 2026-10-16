package com.hms.repository;

import com.hms.entity.Appointment;
import com.hms.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientId(Long patientId);
    List<Appointment> findByDoctorId(Long doctorId);
    boolean existsByDoctorIdAndDateAndTimeSlotAndStatusNot(Long doctorId, LocalDate date, String timeSlot, AppointmentStatus status);
}
