package com.crm.web.dto;

import jakarta.validation.constraints.NotBlank;

public record DealStagePatchRequest(@NotBlank String stageName) {}
