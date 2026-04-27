package com.crm.web.dto;

import jakarta.validation.constraints.NotNull;

public record UserAlignmentPatchRequest(@NotNull Long alignmentId) {
}
