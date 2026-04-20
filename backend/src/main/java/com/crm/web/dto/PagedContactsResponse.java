package com.crm.web.dto;

import java.util.List;

public record PagedContactsResponse(
        List<ContactListRowDto> content,
        long totalElements,
        int totalPages,
        int number,
        int size) {}
