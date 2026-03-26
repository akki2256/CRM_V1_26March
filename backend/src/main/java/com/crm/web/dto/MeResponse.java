package com.crm.web.dto;

import java.util.List;

public record MeResponse(
        Long userId,
        String username,
        String firstName,
        String lastName,
        String email,
        List<String> groups,
        boolean mustChangePassword) {}
