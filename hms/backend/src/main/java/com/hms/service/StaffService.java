package com.hms.service;

import com.hms.dto.StaffAccountResponse;
import com.hms.dto.StaffCreateRequest;
import com.hms.entity.Role;
import com.hms.entity.User;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Billing staff don't have their own entity like Patient/Doctor — they're
 * just User rows with role = BILLING_STAFF. This service is the admin-facing
 * CRUD for those login accounts.
 */
@Service
@RequiredArgsConstructor
public class StaffService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<StaffAccountResponse> getBillingStaff() {
        return userRepository.findByRole(Role.BILLING_STAFF).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public StaffAccountResponse createBillingStaff(StaffCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(Role.BILLING_STAFF)
                .build();
        user = userRepository.save(user);
        return toResponse(user);
    }

    public void deleteStaff(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Staff account not found"));
        if (user.getRole() != Role.BILLING_STAFF) {
            throw new IllegalArgumentException("This account is not a billing staff account");
        }
        userRepository.deleteById(userId);
    }

    private StaffAccountResponse toResponse(User user) {
        return StaffAccountResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .build();
    }
}
