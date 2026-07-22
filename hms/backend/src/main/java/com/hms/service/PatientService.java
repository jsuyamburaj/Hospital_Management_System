package com.hms.service;

import com.hms.dto.PatientCreateRequest;
import com.hms.entity.Patient;
import com.hms.entity.Role;
import com.hms.entity.User;
import com.hms.repository.PatientRepository;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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

    /**
     * Used by the ADMIN "Add Patient" form. If both email and password are
     * supplied, a linked User login (role = PATIENT) is created first, its
     * hashed password stored in the users table, and the Patient profile
     * is linked to it via userId. If email/password are omitted, the
     * patient is created without login access (as before).
     */
    @Transactional
    public Patient createWithAccount(PatientCreateRequest request) {
        Long linkedUserId = null;

        boolean wantsAccount = request.getEmail() != null && !request.getEmail().isBlank()
                && request.getPassword() != null && !request.getPassword().isBlank();

        if (wantsAccount) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("An account with this email already exists");
            }
            if (request.getPassword().length() < 6) {
                throw new IllegalArgumentException("Password must be at least 6 characters");
            }
            User user = User.builder()
                    .name(request.getName())
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .role(Role.PATIENT)
                    .build();
            user = userRepository.save(user);
            linkedUserId = user.getId();
        }

        Patient patient = Patient.builder()
                .name(request.getName())
                .age(request.getAge())
                .disease(request.getDisease())
                .doctorId(request.getDoctorId())
                .email(request.getEmail())
                .phone(request.getPhone())
                .userId(linkedUserId)
                .build();

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
