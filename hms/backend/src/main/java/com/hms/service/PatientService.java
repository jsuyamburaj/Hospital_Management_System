package com.hms.service;

import com.hms.entity.Patient;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;

    public List<Patient> getAll() {
        return patientRepository.findAll();
    }

    public List<Patient> search(String name) {
        return patientRepository.findByNameContainingIgnoreCase(name);
    }

    public Patient getById(Long id) {
        return patientRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Patient not found with id: " + id));
    }

    public Patient getByUserId(Long userId) {
        return patientRepository.findByUserId(userId)
                .orElseThrow(() -> new NoSuchElementException("No patient profile linked to this account"));
    }

    public List<Patient> getByDoctorId(Long doctorId) {
        return patientRepository.findByDoctorId(doctorId);
    }

    public Patient create(Patient patient) {
        return patientRepository.save(patient);
    }

    public Patient update(Long id, Patient updated) {
        Patient existing = getById(id);
        existing.setName(updated.getName());
        existing.setAge(updated.getAge());
        existing.setDisease(updated.getDisease());
        existing.setDoctorId(updated.getDoctorId());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        return patientRepository.save(existing);
    }

    public void delete(Long id) {
        if (!patientRepository.existsById(id)) {
            throw new NoSuchElementException("Patient not found with id: " + id);
        }
        patientRepository.deleteById(id);
    }
}
