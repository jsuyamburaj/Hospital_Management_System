package com.hms.controller;

import com.hms.dto.StaffAccountResponse;
import com.hms.dto.StaffCreateRequest;
import com.hms.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class StaffController {

    private final StaffService staffService;

    @GetMapping("/billing")
    public ResponseEntity<List<StaffAccountResponse>> getBillingStaff() {
        return ResponseEntity.ok(staffService.getBillingStaff());
    }

    @PostMapping("/billing")
    public ResponseEntity<StaffAccountResponse> createBillingStaff(@Valid @RequestBody StaffCreateRequest request) {
        return ResponseEntity.ok(staffService.createBillingStaff(request));
    }

    @DeleteMapping("/billing/{id}")
    public ResponseEntity<Void> deleteBillingStaff(@PathVariable Long id) {
        staffService.deleteStaff(id);
        return ResponseEntity.noContent().build();
    }
}
