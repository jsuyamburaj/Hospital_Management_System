package com.hms.service;

import com.hms.dto.DoctorCreateRequest;
import com.hms.entity.Doctor;
import com.hms.entity.Role;
import com.hms.entity.User;
import com.hms.repository.DoctorRepository;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<Doctor> getAll() {
        return doctorRepository.findAll();
    }

    public Doctor getById(Long id) {
        return doctorRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Doctor not found with id: " + id));
    }

    public Doctor getByUserId(Long userId) {
        return doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new NoSuchElementException("No doctor profile linked to this account"));
    }

    /**
     * Used by the ADMIN "Add Doctor" form. If both email and password are
     * supplied, a linked User login (role = DOCTOR) is created first, its
     * hashed password stored in the users table, and the Doctor profile
     * is linked to it via userId. If email/password are omitted, the
     * doctor is created without login access (as before).
     */
    @Transactional
    public Doctor createWithAccount(DoctorCreateRequest request) {
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
                    .role(Role.DOCTOR)
                    .build();
            user = userRepository.save(user);
            linkedUserId = user.getId();
        }

        Doctor doctor = Doctor.builder()
                .name(request.getName())
                .specialization(request.getSpecialization())
                .email(request.getEmail())
                .phone(request.getPhone())
                .userId(linkedUserId)
                .build();

        return doctorRepository.save(doctor);
    }

    public Doctor update(Long id, Doctor updated) {
        Doctor existing = getById(id);
        existing.setName(updated.getName());
        existing.setSpecialization(updated.getSpecialization());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        return doctorRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Doctor not found with id: " + id));
        Long userId = doctor.getUserId();
        doctorRepository.deleteById(id);
        if (userId != null && userRepository.existsById(userId)) {
            userRepository.deleteById(userId);
        }
    }
}
