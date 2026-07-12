package com.hms.controller;

import com.hms.entity.Billing;
import com.hms.service.BillingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        billingService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
