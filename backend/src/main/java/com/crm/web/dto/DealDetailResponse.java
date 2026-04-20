package com.crm.web.dto;

import java.math.BigDecimal;

public record DealDetailResponse(
        long dealId,
        long contactId,
        String contactName,
        String purposeOfLoan,
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
        String dealComments,
        boolean canEditContactAndAccount) {}
