package com.hms.controller;

import com.hms.dto.DashboardSummary;
import com.hms.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final ReportService reportService;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardSummary> dashboard() {
        return ResponseEntity.ok(reportService.getDashboardSummary());
    }
}
