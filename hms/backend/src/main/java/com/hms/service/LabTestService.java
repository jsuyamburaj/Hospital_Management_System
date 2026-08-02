package com.hms.service;

import com.hms.entity.LabTest;
import com.hms.entity.LabTestStatus;
import com.hms.repository.LabTestRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class LabTestService {

    private final LabTestRepository labTestRepository;
    private final PatientRepository patientRepository;
    private final NotificationService notificationService;

    public List<LabTest> getAll() {
        return labTestRepository.findAll();
    }

    public LabTest getById(Long id) {
        return labTestRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Lab test not found with id: " + id));
    }

    public List<LabTest> getByPatientId(Long patientId) {
        return labTestRepository.findByPatientId(patientId);
    }

    public List<LabTest> getByDoctorId(Long doctorId) {
        return labTestRepository.findByDoctorId(doctorId);
    }

    @Transactional
    public LabTest order(LabTest labTest) {
        labTest.setStatus(LabTestStatus.ORDERED);
        LabTest saved = labTestRepository.save(labTest);
        notifyPatient(saved, "A new lab test (" + saved.getTestName() + ") has been ordered for you.");
        return saved;
    }

    @Transactional
    public LabTest updateStatus(Long id, LabTestStatus status) {
        LabTest existing = getById(id);
        existing.setStatus(status);
        LabTest saved = labTestRepository.save(existing);
        if (status == LabTestStatus.IN_PROGRESS) {
            notifyPatient(saved, "Your lab test (" + saved.getTestName() + ") is now in progress.");
        }
        return saved;
    }

    @Transactional
    public LabTest completeWithResult(Long id, String resultSummary) {
        LabTest existing = getById(id);
        existing.setStatus(LabTestStatus.COMPLETED);
        existing.setResultSummary(resultSummary);
        existing.setCompletedDate(java.time.LocalDate.now());
        LabTest saved = labTestRepository.save(existing);
        notifyPatient(saved, "Your lab test (" + saved.getTestName() + ") result is ready.");
        return saved;
    }

    private void notifyPatient(LabTest labTest, String message) {
        patientRepository.findById(labTest.getPatientId()).ifPresent(patient -> {
            if (patient.getUserId() != null) {
                notificationService.notifyUser(patient.getUserId(), "LAB_TEST", message, labTest.getId());
            }
        });
    }
}
