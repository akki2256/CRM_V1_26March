package com.crm.web.dto;

import java.util.List;

public record ContactSearchRequest(
        Integer page, Integer size, String sortField, String sortDirection, List<ColumnFilterEntry> filters) {

    public ContactSearchRequest {
        if (filters == null) {
            filters = List.of();
        }
    }
}
