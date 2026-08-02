package com.hms.controller;

import com.hms.entity.Medicine;
import com.hms.service.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pharmacy")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;

    // Viewable by any authenticated staff role - doctors/billing staff often
    // need to check stock while prescribing or billing.
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'BILLING_STAFF')")
    public ResponseEntity<List<Medicine>> getAll(@RequestParam(required = false) String search) {
        return ResponseEntity.ok(search != null && !search.isBlank()
                ? medicineService.search(search)
                : medicineService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'BILLING_STAFF')")
    public ResponseEntity<Medicine> getById(@PathVariable Long id) {
        return ResponseEntity.ok(medicineService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Medicine> create(@RequestBody Medicine medicine) {
        return ResponseEntity.ok(medicineService.create(medicine));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Medicine> update(@PathVariable Long id, @RequestBody Medicine medicine) {
        return ResponseEntity.ok(medicineService.update(id, medicine));
    }

    // Quick stock adjustment: { "delta": -5 } or { "delta": 20 }
    @PutMapping("/{id}/adjust-stock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Medicine> adjustStock(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(medicineService.adjustStock(id, body.getOrDefault("delta", 0)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        medicineService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
