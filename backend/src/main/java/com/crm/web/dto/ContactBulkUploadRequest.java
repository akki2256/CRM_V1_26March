package com.crm.web.dto;

import java.util.List;

public record ContactBulkUploadRequest(List<ContactBulkUploadRowRequest> rows) {}
