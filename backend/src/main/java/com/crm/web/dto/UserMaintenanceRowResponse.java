package com.crm.web.dto;

import java.util.List;

public record UserMaintenanceRowResponse(
        Long userId,
        String username,
        String firstName,
        String lastName,
        List<String> userGroups,
        String email,
        String phoneNumber) {
}
