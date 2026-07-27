package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CompleteAppointmentRequest {

    @NotBlank(message = "Prescribed medicines are required to complete a visit")
    private String medicines;

    private String notes;
}
