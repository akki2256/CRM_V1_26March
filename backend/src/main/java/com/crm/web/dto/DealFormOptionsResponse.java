package com.crm.web.dto;

import java.util.List;

public record DealFormOptionsResponse(
        List<DealContactOptionResponse> contacts, List<DealUserOptionResponse> users, List<DealStageOptionResponse> stages) {}
