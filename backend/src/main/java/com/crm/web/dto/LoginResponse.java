package com.crm.web.dto;

public record LoginResponse(String accessToken, boolean requiresPasswordChange) {}
