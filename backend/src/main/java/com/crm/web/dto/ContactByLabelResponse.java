package com.crm.web.dto;

import java.util.List;

public record ContactByLabelResponse(List<ContactByLabelSliceDto> slices, long total) {}
