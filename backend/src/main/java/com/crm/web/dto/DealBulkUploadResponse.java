package com.crm.web.dto;

import java.util.List;

public record DealBulkUploadResponse(boolean success, int savedCount, List<String> errors) {}
