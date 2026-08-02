package com.hms.service;

import com.hms.dto.ChangePasswordRequest;
import com.hms.dto.UpdateProfileRequest;
import com.hms.dto.UserProfileResponse;
import com.hms.entity.Doctor;
import com.hms.entity.Patient;
import com.hms.entity.Role;
import com.hms.entity.User;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/**
 * Self-service account management: viewing your own profile, editing the
 * fields that belong to your role, and changing your password. Name and
 * email are never editable here - see UpdateProfileRequest.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;

    public UserProfileResponse getProfile(Long userId) {
        User user = getUser(userId);
        return toResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = getUser(userId);

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        userRepository.save(user);

        if (user.getRole() == Role.PATIENT) {
            Patient patient = patientRepository.findByUserId(userId)
                    .orElseThrow(() -> new NoSuchElementException("No patient profile linked to this account"));
            if (request.getPhone() != null) patient.setPhone(request.getPhone());
            if (request.getAge() != null) patient.setAge(request.getAge());
            if (request.getDisease() != null) patient.setDisease(request.getDisease());
            patientRepository.save(patient);
        } else if (user.getRole() == Role.DOCTOR) {
            Doctor doctor = doctorRepository.findByUserId(userId)
                    .orElseThrow(() -> new NoSuchElementException("No doctor profile linked to this account"));
            if (request.getPhone() != null) doctor.setPhone(request.getPhone());
            if (request.getSpecialization() != null) doctor.setSpecialization(request.getSpecialization());
            doctorRepository.save(doctor);
        }

        return toResponse(user);
    }

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = getUser(userId);
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadCredentialsException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public UserProfileResponse updatePhoto(Long userId, String photoData) {
        User user = getUser(userId);
        user.setPhotoData(photoData);
        userRepository.save(user);
        return toResponse(user);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Account not found"));
    }

    private UserProfileResponse toResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .photoData(user.getPhotoData())
                .role(user.getRole())
                .build();
    }
}
