package com.crm.web.dto;

import jakarta.validation.constraints.NotBlank;

public record ExportEmailRequest(
        @NotBlank String fileName,
        @NotBlank String mimeType,
        @NotBlank String base64Content) {
}
