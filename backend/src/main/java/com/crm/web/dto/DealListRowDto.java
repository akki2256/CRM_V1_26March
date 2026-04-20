package com.crm.web.dto;

import java.math.BigDecimal;

public record DealListRowDto(
        long dealId,
        long contactId,
        String contactName,
        String ownerName,
        String subOwnerName,
        String accountName,
        long dealUserId,
        String dealUserName,
        String closingDate,
        long stageId,
        String stageName,
        BigDecimal amount,
        String dealDate,
        String pipeline,
        String currency,
        String purposeOfLoan,
        String dealComments) {}
