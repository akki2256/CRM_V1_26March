package com.crm.web.dto;

import java.math.BigDecimal;

public record ContactListRowDto(
        Long contactId,
        String agentEmail,
        String contactName,
        String countryCode,
        String phoneNumber,
        String email,
        String productCode,
        String purposeOfLoan,
        String addressText,
        BigDecimal customerIncome,
        String employmentStatusCode,
        String mortgageYn,
        String otherExistingLoansYn,
        String creditCardYn,
        String typeCode,
        String segmentCode,
        String statusCode,
        String labelCode,
        String ownerName,
        String subOwnerName,
        String accountName) {}
