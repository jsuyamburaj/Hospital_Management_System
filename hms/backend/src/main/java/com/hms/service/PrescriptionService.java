package com.hms.service;

import com.hms.entity.Prescription;
import com.hms.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;

    public List<Prescription> getByPatientId(Long patientId) {
        return prescriptionRepository.findByPatientId(patientId);
    }

    public List<Prescription> getByDoctorId(Long doctorId) {
        return prescriptionRepository.findByDoctorId(doctorId);
    }

    // Completed treatments that billing staff haven't turned into a bill yet
    public List<Prescription> getUnbilled() {
        return prescriptionRepository.findByBilledFalse();
    }

    public Prescription getByAppointmentId(Long appointmentId) {
        return prescriptionRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new NoSuchElementException("No prescription found for this appointment"));
    }

    public Prescription create(Long appointmentId, Long patientId, Long doctorId, String medicines, String notes) {
        return prescriptionRepository.save(Prescription.builder()
                .appointmentId(appointmentId)
                .patientId(patientId)
                .doctorId(doctorId)
                .medicines(medicines)
                .notes(notes)
                .build());
    }

    public void markBilled(Long prescriptionId) {
        Prescription p = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new NoSuchElementException("Prescription not found"));
        p.setBilled(true);
        prescriptionRepository.save(p);
    }
}
