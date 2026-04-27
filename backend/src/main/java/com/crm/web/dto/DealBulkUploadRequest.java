package com.crm.web.dto;

import java.util.List;

public record DealBulkUploadRequest(List<DealBulkUploadRowRequest> rows) {}
