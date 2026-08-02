package com.hms.service;

import com.hms.entity.Admission;
import com.hms.entity.AdmissionStatus;
import com.hms.repository.AdmissionRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class AdmissionService {

    private final AdmissionRepository admissionRepository;
    private final PatientRepository patientRepository;
    private final NotificationService notificationService;

    public List<Admission> getAll() {
        return admissionRepository.findAll();
    }

    public Admission getById(Long id) {
        return admissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Admission record not found with id: " + id));
    }

    public List<Admission> getByPatientId(Long patientId) {
        return admissionRepository.findByPatientId(patientId);
    }

    public List<Admission> getByDoctorId(Long doctorId) {
        return admissionRepository.findByDoctorId(doctorId);
    }

    @Transactional
    public Admission create(Admission admission) {
        admission.setStatus(AdmissionStatus.ADMITTED);
        Admission saved = admissionRepository.save(admission);
        String message = saved.getType().name().equals("INPATIENT")
                ? "You've been admitted" + (saved.getWard() != null ? " to ward " + saved.getWard() : "") + "."
                : "An outpatient visit record has been created for you.";
        notifyPatient(saved, message);
        return saved;
    }

    public Admission update(Long id, Admission updated) {
        Admission existing = getById(id);
        existing.setType(updated.getType());
        existing.setWard(updated.getWard());
        existing.setRoomNumber(updated.getRoomNumber());
        existing.setAdmissionDate(updated.getAdmissionDate());
        existing.setReason(updated.getReason());
        return admissionRepository.save(existing);
    }

    @Transactional
    public Admission discharge(Long id) {
        Admission existing = getById(id);
        existing.setStatus(AdmissionStatus.DISCHARGED);
        existing.setDischargeDate(java.time.LocalDate.now());
        Admission saved = admissionRepository.save(existing);
        notifyPatient(saved, "You've been discharged. Please check billing for any final invoices.");
        return saved;
    }

    public void delete(Long id) {
        if (!admissionRepository.existsById(id)) {
            throw new NoSuchElementException("Admission record not found with id: " + id);
        }
        admissionRepository.deleteById(id);
    }

    private void notifyPatient(Admission admission, String message) {
        patientRepository.findById(admission.getPatientId()).ifPresent(patient -> {
            if (patient.getUserId() != null) {
                notificationService.notifyUser(patient.getUserId(), "ADMISSION", message, admission.getId());
            }
        });
    }
}
