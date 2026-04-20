package com.crm.web.dto;

import jakarta.validation.constraints.NotBlank;

public record DealAccountPatchRequest(@NotBlank String accountName) {}
