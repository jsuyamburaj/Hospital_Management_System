package com.hms.controller;

import com.hms.entity.Admission;
import com.hms.service.AdmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admissions")
@RequiredArgsConstructor
public class AdmissionController {

    private final AdmissionService admissionService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<List<Admission>> getAll() {
        return ResponseEntity.ok(admissionService.getAll());
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Admission>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(admissionService.getByPatientId(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<List<Admission>> getByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(admissionService.getByDoctorId(doctorId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<Admission> create(@RequestBody Admission admission) {
        return ResponseEntity.ok(admissionService.create(admission));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<Admission> update(@PathVariable Long id, @RequestBody Admission admission) {
        return ResponseEntity.ok(admissionService.update(id, admission));
    }

    @PutMapping("/{id}/discharge")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<Admission> discharge(@PathVariable Long id) {
        return ResponseEntity.ok(admissionService.discharge(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        admissionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
