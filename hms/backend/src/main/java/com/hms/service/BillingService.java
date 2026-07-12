package com.hms.service;

import com.hms.entity.Billing;
import com.hms.repository.BillingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final BillingRepository billingRepository;

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

    public Billing create(Billing billing) {
        return billingRepository.save(billing);
    }

    public Billing update(Long id, Billing updated) {
        Billing existing = getById(id);
        existing.setAmount(updated.getAmount());
        existing.setStatus(updated.getStatus());
        existing.setDate(updated.getDate());
        existing.setDescription(updated.getDescription());
        return billingRepository.save(existing);
    }

    public void delete(Long id) {
        if (!billingRepository.existsById(id)) {
            throw new NoSuchElementException("Billing record not found with id: " + id);
        }
        billingRepository.deleteById(id);
    }
}
