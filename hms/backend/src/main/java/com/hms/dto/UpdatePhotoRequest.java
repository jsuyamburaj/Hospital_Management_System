package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdatePhotoRequest {

    // A base64 data URI, e.g. "data:image/png;base64,...". Kept as a single
    // string so the frontend can send whatever FileReader.readAsDataURL()
    // produces directly, with no separate multipart upload endpoint needed.
    @NotBlank(message = "Photo data is required")
    private String photoData;
}
