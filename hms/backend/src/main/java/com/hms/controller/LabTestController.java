package com.hms.controller;

import com.hms.dto.CompleteLabTestRequest;
import com.hms.entity.LabTest;
import com.hms.entity.LabTestStatus;
import com.hms.service.LabTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lab-tests")
@RequiredArgsConstructor
public class LabTestController {

    private final LabTestService labTestService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<List<LabTest>> getAll() {
        return ResponseEntity.ok(labTestService.getAll());
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<LabTest>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(labTestService.getByPatientId(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<List<LabTest>> getByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(labTestService.getByDoctorId(doctorId));
    }

    // Doctor orders a new test
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<LabTest> order(@RequestBody LabTest labTest) {
        return ResponseEntity.ok(labTestService.order(labTest));
    }

    // Move to IN_PROGRESS: { "status": "IN_PROGRESS" }
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<LabTest> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(labTestService.updateStatus(id, LabTestStatus.valueOf(body.get("status").toUpperCase())));
    }

    // Complete with the result summary in one step
    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<LabTest> complete(@PathVariable Long id, @Valid @RequestBody CompleteLabTestRequest request) {
        return ResponseEntity.ok(labTestService.completeWithResult(id, request.getResultSummary()));
    }
}
