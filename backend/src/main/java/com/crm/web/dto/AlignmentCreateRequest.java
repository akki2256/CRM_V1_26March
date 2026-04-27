package com.crm.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AlignmentCreateRequest(@NotBlank String alignmentName) {
}
