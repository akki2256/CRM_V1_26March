package com.crm.web.dto;

import jakarta.validation.constraints.NotNull;

public record DealContactPatchRequest(@NotNull Long contactId) {}
