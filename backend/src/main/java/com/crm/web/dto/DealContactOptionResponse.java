package com.crm.web.dto;

public record DealContactOptionResponse(
        long contactId, String contactName, String purposeOfLoan, String accountName) {}
