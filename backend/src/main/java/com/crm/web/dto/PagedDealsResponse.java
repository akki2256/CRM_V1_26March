package com.crm.web.dto;

import java.util.List;

public record PagedDealsResponse(
        List<DealListRowDto> content, long totalElements, int totalPages, int number, int size) {}
