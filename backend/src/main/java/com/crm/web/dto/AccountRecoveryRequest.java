package com.crm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AccountRecoveryRequest(@NotBlank @Size(max = 255) String emailOrUsername) {}
