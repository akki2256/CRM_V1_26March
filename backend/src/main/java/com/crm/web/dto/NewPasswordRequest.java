package com.crm.web.dto;

import jakarta.validation.constraints.NotBlank;

public record NewPasswordRequest(@NotBlank String newPassword) {}
