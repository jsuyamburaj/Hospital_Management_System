package com.hms.service;

import com.hms.dto.DashboardSummary;
import com.hms.dto.RevenueReport;
import com.hms.entity.Billing;
import com.hms.entity.BillingStatus;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.BillingRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final BillingRepository billingRepository;

    private static final DateTimeFormatter MONTH_KEY = DateTimeFormatter.ofPattern("yyyy-MM");

    public DashboardSummary getDashboardSummary() {
        double revenue = billingRepository.findByStatus(BillingStatus.PAID).stream()
                .mapToDouble(Billing::getAmount)
                .sum();

        return DashboardSummary.builder()
                .totalPatients(patientRepository.count())
                .totalDoctors(doctorRepository.count())
                .totalAppointments(appointmentRepository.count())
                .totalRevenue(revenue)
                .build();
    }

    public RevenueReport getRevenueReport() {
        List<Billing> allBillings = billingRepository.findAll();

        double paid = allBillings.stream()
                .filter(b -> b.getStatus() == BillingStatus.PAID)
                .mapToDouble(Billing::getAmount)
                .sum();

        double unpaid = allBillings.stream()
                .filter(b -> b.getStatus() == BillingStatus.UNPAID)
                .mapToDouble(Billing::getAmount)
                .sum();

        Map<String, Double> monthlyRevenue = allBillings.stream()
                .filter(b -> b.getStatus() == BillingStatus.PAID)
                .collect(Collectors.groupingBy(
                        b -> b.getDate().format(MONTH_KEY),
                        LinkedHashMap::new,
                        Collectors.summingDouble(Billing::getAmount)
                ));

        List<Map<String, Object>> monthlyStats = monthlyRevenue.entrySet().stream()
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("month", e.getKey());
                    row.put("revenue", e.getValue());
                    return row;
                })
                .collect(Collectors.toList());

        return RevenueReport.builder()
                .totalRevenue(paid)
                .paidAmount(paid)
                .unpaidAmount(unpaid)
                .monthlyRevenue(monthlyRevenue)
                .monthlyStats(monthlyStats)
                .build();
    }
}
