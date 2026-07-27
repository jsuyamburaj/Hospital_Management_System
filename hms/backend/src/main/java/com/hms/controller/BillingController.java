package com.hms.controller;

import com.hms.entity.Billing;
import com.hms.security.UserPrincipal;
import com.hms.service.BillingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'BILLING_STAFF')")
    public ResponseEntity<List<Billing>> getAll() {
        return ResponseEntity.ok(billingService.getAll());
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Billing>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(billingService.getByPatientId(patientId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'BILLING_STAFF')")
    public ResponseEntity<Billing> create(@RequestBody Billing billing) {
        return ResponseEntity.ok(billingService.create(billing));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BILLING_STAFF')")
    public ResponseEntity<Billing> update(@PathVariable Long id, @RequestBody Billing billing) {
        return ResponseEntity.ok(billingService.update(id, billing));
    }

    // Patient pays via the in-app payment page (QR / GPay demo flow)
    @PutMapping("/{id}/pay-online")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<Billing> payOnline(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(billingService.payOnline(id, principal.getId()));
    }

    // Billing staff records a payment taken in person/cash at the office
    @PutMapping("/{id}/pay-offline")
    @PreAuthorize("hasAnyRole('ADMIN', 'BILLING_STAFF')")
    public ResponseEntity<Billing> payOffline(@PathVariable Long id) {
        return ResponseEntity.ok(billingService.payOffline(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        billingService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
