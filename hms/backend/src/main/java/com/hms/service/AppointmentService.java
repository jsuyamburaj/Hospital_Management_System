package com.hms.service;

import com.hms.entity.Appointment;
import com.hms.entity.AppointmentStatus;
import com.hms.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;

    public List<Appointment> getAll() {
        return appointmentRepository.findAll();
    }

    public Appointment getById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Appointment not found with id: " + id));
    }

    public List<Appointment> getByPatientId(Long patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    public List<Appointment> getByDoctorId(Long doctorId) {
        return appointmentRepository.findByDoctorId(doctorId);
    }

    public Appointment book(Appointment appointment) {
        appointment.setStatus(AppointmentStatus.PENDING);
        return appointmentRepository.save(appointment);
    }

    public Appointment updateStatus(Long id, AppointmentStatus status) {
        Appointment existing = getById(id);
        existing.setStatus(status);
        return appointmentRepository.save(existing);
    }

    public Appointment update(Long id, Appointment updated) {
        Appointment existing = getById(id);
        existing.setDate(updated.getDate());
        existing.setDoctorId(updated.getDoctorId());
        existing.setReason(updated.getReason());
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        return appointmentRepository.save(existing);
    }
}
