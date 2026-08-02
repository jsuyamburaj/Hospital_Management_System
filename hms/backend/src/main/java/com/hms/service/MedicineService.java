package com.hms.service;

import com.hms.entity.Medicine;
import com.hms.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class MedicineService {

    private final MedicineRepository medicineRepository;

    public List<Medicine> getAll() {
        return medicineRepository.findAll();
    }

    public List<Medicine> search(String name) {
        return medicineRepository.findByNameContainingIgnoreCase(name);
    }

    public Medicine getById(Long id) {
        return medicineRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Medicine not found with id: " + id));
    }

    public Medicine create(Medicine medicine) {
        return medicineRepository.save(medicine);
    }

    public Medicine update(Long id, Medicine updated) {
        Medicine existing = getById(id);
        existing.setName(updated.getName());
        existing.setCategory(updated.getCategory());
        existing.setStock(updated.getStock());
        existing.setUnit(updated.getUnit());
        existing.setPrice(updated.getPrice());
        existing.setExpiryDate(updated.getExpiryDate());
        if (updated.getLowStockThreshold() != null) {
            existing.setLowStockThreshold(updated.getLowStockThreshold());
        }
        return medicineRepository.save(existing);
    }

    // Quick +/- stock adjustment without needing the full edit form
    public Medicine adjustStock(Long id, int delta) {
        Medicine existing = getById(id);
        int newStock = Math.max(0, existing.getStock() + delta);
        existing.setStock(newStock);
        return medicineRepository.save(existing);
    }

    public void delete(Long id) {
        if (!medicineRepository.existsById(id)) {
            throw new NoSuchElementException("Medicine not found with id: " + id);
        }
        medicineRepository.deleteById(id);
    }
}
