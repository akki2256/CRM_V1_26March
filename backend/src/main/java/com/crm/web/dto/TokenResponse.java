package com.crm.web.dto;

public record TokenResponse(String accessToken, boolean requiresPasswordChange) {}
