package com.hms.service;

import com.hms.entity.Appointment;
import com.hms.entity.AppointmentStatus;
import com.hms.entity.Doctor;
import com.hms.entity.Patient;
import com.hms.entity.Role;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final PrescriptionService prescriptionService;
    private final NotificationService notificationService;

    public List<Appointment> getAll() {
        return appointmentRepository.findAll();
    }

    public Appointment getById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Appointment not found with id: " + id));
    }

    public List<Appointment> getByPatientId(Long patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    public List<Appointment> getByDoctorId(Long doctorId) {
        return appointmentRepository.findByDoctorId(doctorId);
    }

    // Patient books a new appointment request - notifies the assigned doctor
    @Transactional
    public Appointment book(Appointment appointment) {
        if (appointment.getDate() == null) {
            throw new IllegalArgumentException("Appointment date is required.");
        }
        if (appointment.getDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Cannot book an appointment for a past date.");
        }
        if (appointment.getDoctorId() == null || !doctorRepository.existsById(appointment.getDoctorId())) {
            throw new IllegalArgumentException("Selected doctor does not exist.");
        }
        if (appointment.getPatientId() == null || !patientRepository.existsById(appointment.getPatientId())) {
            throw new IllegalArgumentException("Patient profile not found.");
        }
        if (appointment.getTimeSlot() != null && !appointment.getTimeSlot().isBlank()) {
            boolean conflict = appointmentRepository.existsByDoctorIdAndDateAndTimeSlotAndStatusNot(
                    appointment.getDoctorId(), appointment.getDate(), appointment.getTimeSlot(), AppointmentStatus.REJECTED);
            if (conflict) {
                throw new IllegalArgumentException("The selected doctor already has a booked appointment at " + appointment.getTimeSlot() + " on this date.");
            }
        }

        appointment.setStatus(AppointmentStatus.PENDING);
        Appointment saved = appointmentRepository.save(appointment);

        doctorRepository.findById(appointment.getDoctorId()).ifPresent(doctor -> {
            if (doctor.getUserId() != null) {
                String slotInfo = saved.getTimeSlot() != null ? " (" + saved.getTimeSlot() + ")" : "";
                notificationService.notifyUser(doctor.getUserId(), "APPOINTMENT_REQUEST",
                        "New appointment request for " + saved.getDate() + slotInfo, saved.getId());
            }
        });
        return saved;
    }

    /**
     * Approve/reject a pending request, or mark an approved visit completed.
     * Only the doctor the appointment is assigned to (or an admin) may call
     * this - callingUserId/callingRole come from the authenticated principal.
     */
    @Transactional
    public Appointment updateStatus(Long id, AppointmentStatus status, Long callingUserId, Role callingRole) {
        Appointment existing = getById(id);
        assertDoctorOwnsAppointment(existing, callingUserId, callingRole);

        existing.setStatus(status);
        Appointment saved = appointmentRepository.save(existing);

        notifyPatientOfStatusChange(saved, status);
        return saved;
    }

    /** Doctor completes a visit and records the prescribed medicine in one step. */
    @Transactional
    public Appointment completeWithPrescription(Long id, String medicines, String notes,
                                                 Long callingUserId, Role callingRole) {
        Appointment existing = getById(id);
        assertDoctorOwnsAppointment(existing, callingUserId, callingRole);

        existing.setStatus(AppointmentStatus.COMPLETED);
        Appointment saved = appointmentRepository.save(existing);

        prescriptionService.create(saved.getId(), saved.getPatientId(), saved.getDoctorId(), medicines, notes);

        notifyPatientOfStatusChange(saved, AppointmentStatus.COMPLETED);
        // Let every billing staff account know a patient is ready to be billed
        patientRepository.findById(saved.getPatientId()).ifPresent(patient ->
                notificationService.notifyRole(Role.BILLING_STAFF, "READY_TO_BILL",
                        (patient.getName() != null ? patient.getName() : "A patient") + " finished treatment and is ready for billing",
                        saved.getId()));
        return saved;
    }

    public Appointment update(Long id, Appointment updated) {
        Appointment existing = getById(id);
        existing.setDate(updated.getDate());
        existing.setDoctorId(updated.getDoctorId());
        existing.setReason(updated.getReason());
        if (updated.getTimeSlot() != null) {
            existing.setTimeSlot(updated.getTimeSlot());
        }
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        return appointmentRepository.save(existing);
    }

    /** Reception marks a patient as physically arrived for their visit. */
    public Appointment checkIn(Long id) {
        Appointment existing = getById(id);
        existing.setCheckedIn(true);
        return appointmentRepository.save(existing);
    }

    private void assertDoctorOwnsAppointment(Appointment appointment, Long callingUserId, Role callingRole) {
        if (callingRole == Role.ADMIN) {
            return; // admins can still act as a fallback/override
        }
        Doctor doctor = doctorRepository.findByUserId(callingUserId)
                .orElseThrow(() -> new AccessDeniedException("No doctor profile linked to this account"));
        if (!doctor.getId().equals(appointment.getDoctorId())) {
            throw new AccessDeniedException("You can only manage your own appointments");
        }
    }

    private void notifyPatientOfStatusChange(Appointment appointment, AppointmentStatus status) {
        Patient patient = patientRepository.findById(appointment.getPatientId()).orElse(null);
        if (patient == null || patient.getUserId() == null) return;

        String message = switch (status) {
            case APPROVED -> "Your appointment on " + appointment.getDate() + " was approved.";
            case REJECTED -> "Your appointment on " + appointment.getDate() + " was rejected.";
            case COMPLETED -> "Your treatment on " + appointment.getDate() + " is complete. Check your bills soon.";
            case PENDING -> "Your appointment request on " + appointment.getDate() + " is pending review.";
        };
        notificationService.notifyUser(patient.getUserId(), "APPOINTMENT_" + status, message, appointment.getId());
    }
}
