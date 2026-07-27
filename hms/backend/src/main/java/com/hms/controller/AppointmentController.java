package com.hms.controller;

import com.hms.dto.CompleteAppointmentRequest;
import com.hms.entity.Appointment;
import com.hms.entity.AppointmentStatus;
import com.hms.security.UserPrincipal;
import com.hms.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'BILLING_STAFF')")
    public ResponseEntity<List<Appointment>> getAll() {
        return ResponseEntity.ok(appointmentService.getAll());
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Appointment>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(appointmentService.getByPatientId(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<List<Appointment>> getByDoctor(@PathVariable Long doctorId) {
        return ResponseEntity.ok(appointmentService.getByDoctorId(doctorId));
    }

    // Patient books a new appointment request
    @PostMapping
    public ResponseEntity<Appointment> book(@RequestBody Appointment appointment) {
        return ResponseEntity.ok(appointmentService.book(appointment));
    }

    // Full update (admin editing details)
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<Appointment> update(@PathVariable Long id, @RequestBody Appointment appointment) {
        return ResponseEntity.ok(appointmentService.update(id, appointment));
    }

    // Approve/reject a pending request. Only the assigned doctor (or admin) may call this.
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<Appointment> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        AppointmentStatus status = AppointmentStatus.valueOf(body.get("status").toUpperCase());
        return ResponseEntity.ok(appointmentService.updateStatus(
                id, status, principal.getId(), com.hms.entity.Role.valueOf(principal.getRole())));
    }

    // Doctor completes a visit and records the medicine prescribed in one step.
    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public ResponseEntity<Appointment> complete(@PathVariable Long id,
                                                 @Valid @RequestBody CompleteAppointmentRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(appointmentService.completeWithPrescription(
                id, request.getMedicines(), request.getNotes(),
                principal.getId(), com.hms.entity.Role.valueOf(principal.getRole())));
    }
}
