package com.crm.web.dto;

public record ContactBulkUploadRowRequest(
        String agentEmail,
        String name,
        String countryCode,
        String phoneNumber,
        String email,
        String product,
        String purposeOfLoan,
        String address,
        String income,
        String employmentStatus,
        String mortgage,
        String otherExistingLoans,
        String creditCard,
        String type,
        String segment,
        String status,
        String label,
        String owner,
        String subOwner,
        String account) {}
