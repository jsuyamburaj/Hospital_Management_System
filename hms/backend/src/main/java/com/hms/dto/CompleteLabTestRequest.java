package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CompleteLabTestRequest {

    @NotBlank(message = "Result summary is required to complete a lab test")
    private String resultSummary;
}
