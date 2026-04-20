package com.crm.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record DealCreateRequest(
        @NotNull Long contactId,
        @NotNull Long userId,
        @NotNull LocalDate closingDate,
        @NotNull Long stageId,
        @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal amount,
        @NotNull LocalDate dealDate,
        @NotBlank @Size(max = 200) String pipeline,
        @NotBlank @Size(max = 10) String currency) {}
