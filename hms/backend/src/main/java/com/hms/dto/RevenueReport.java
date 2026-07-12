package com.hms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevenueReport {
    private double totalRevenue;
    private double paidAmount;
    private double unpaidAmount;
    // key = "YYYY-MM", value = revenue collected (PAID bills) that month
    private Map<String, Double> monthlyRevenue;
    private List<Map<String, Object>> monthlyStats;
}
