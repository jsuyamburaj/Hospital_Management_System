package com.hms.service;

import com.hms.entity.Billing;
import com.hms.entity.BillingStatus;
import com.hms.entity.PaymentMethod;
import com.hms.entity.Role;
import com.hms.repository.BillingRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final BillingRepository billingRepository;
    private final PatientRepository patientRepository;
    private final PrescriptionService prescriptionService;
    private final NotificationService notificationService;

    public List<Billing> getAll() {
        return billingRepository.findAll();
    }

    public Billing getById(Long id) {
        return billingRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Billing record not found with id: " + id));
    }

    public List<Billing> getByPatientId(Long patientId) {
        return billingRepository.findByPatientId(patientId);
    }

    @Transactional
    public Billing create(Billing billing) {
        if (billing.getPatientId() == null || !patientRepository.existsById(billing.getPatientId())) {
            throw new NoSuchElementException("Cannot generate bill for non-existent patient ID: " + billing.getPatientId());
        }
        if (billing.getAmount() == null || billing.getAmount() <= 0) {
            throw new IllegalArgumentException("Bill amount must be greater than zero.");
        }
        if (billing.getDate() == null) {
            billing.setDate(java.time.LocalDate.now());
        }

        Billing saved = billingRepository.save(billing);

        if (billing.getPrescriptionId() != null) {
            prescriptionService.markBilled(billing.getPrescriptionId());
        }

        patientRepository.findById(saved.getPatientId()).ifPresent(patient -> {
            if (patient.getUserId() != null) {
                notificationService.notifyUser(patient.getUserId(), "BILL_CREATED",
                        "A new bill of \u20B9" + saved.getAmount() + " has been issued.", saved.getId());
            }
        });
        return saved;
    }

    public Billing update(Long id, Billing updated) {
        Billing existing = getById(id);
        if (updated.getAmount() != null) {
            if (updated.getAmount() <= 0) {
                throw new IllegalArgumentException("Bill amount must be greater than zero.");
            }
            existing.setAmount(updated.getAmount());
        }
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        if (updated.getDate() != null) {
            existing.setDate(updated.getDate());
        }
        if (updated.getDescription() != null) {
            existing.setDescription(updated.getDescription());
        }
        if (updated.getPaymentMethod() != null) {
            existing.setPaymentMethod(updated.getPaymentMethod());
        }
        return billingRepository.save(existing);
    }

    /** Patient completes an online payment on the payment page. */
    @Transactional
    public Billing payOnline(Long id, Long requestingUserId) {
        Billing bill = getById(id);
        patientRepository.findById(bill.getPatientId())
                .filter(p -> p.getUserId() != null && p.getUserId().equals(requestingUserId))
                .orElseThrow(() -> new IllegalArgumentException("This bill does not belong to you"));

        bill.setStatus(BillingStatus.PAID);
        bill.setPaymentMethod(PaymentMethod.ONLINE);
        Billing saved = billingRepository.save(bill);

        notificationService.notifyRole(Role.BILLING_STAFF, "BILL_PAID",
                "Bill #" + saved.getId() + " was paid online.", saved.getId());
        return saved;
    }

    /** Billing staff records a manual/in-person payment. */
    @Transactional
    public Billing payOffline(Long id) {
        Billing bill = getById(id);
        bill.setStatus(BillingStatus.PAID);
        bill.setPaymentMethod(PaymentMethod.OFFLINE);
        return billingRepository.save(bill);
    }

    public void delete(Long id) {
        if (!billingRepository.existsById(id)) {
            throw new NoSuchElementException("Billing record not found with id: " + id);
        }
        billingRepository.deleteById(id);
    }
}
