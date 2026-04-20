package com.crm.web.dto;

import java.util.List;

public record DealSearchRequest(
        Integer page, Integer size, String sortField, String sortDirection, List<ColumnFilterEntry> filters) {

    public DealSearchRequest {
        if (filters == null) {
            filters = List.of();
        }
    }
}
