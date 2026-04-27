package com.crm.web.dto;

import java.util.List;

public record ContactBulkUploadResponse(boolean success, int savedCount, List<String> errors) {}
