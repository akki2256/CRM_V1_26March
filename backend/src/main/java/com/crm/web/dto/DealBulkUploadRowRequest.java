package com.crm.web.dto;

public record DealBulkUploadRowRequest(
        String contactName,
        String userName,
        String closingDate,
        String stageName,
        String amount,
        String dealDate,
        String pipeline,
        String currency,
        String dealComments) {}
