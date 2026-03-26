package com.crm.web;

import com.crm.service.ReferenceDataService;
import com.crm.web.dto.CodeReferenceItemResponse;
import com.crm.web.dto.UserOptionResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reference")
public class ReferenceDataController {

    private final ReferenceDataService referenceDataService;

    public ReferenceDataController(ReferenceDataService referenceDataService) {
        this.referenceDataService = referenceDataService;
    }

    @GetMapping("/code-reference/{categorySid}")
    public List<CodeReferenceItemResponse> codeReference(@PathVariable String categorySid) {
        return referenceDataService.listCodesByCategory(categorySid);
    }

    @GetMapping("/users/admin-owners")
    public List<UserOptionResponse> adminOwners() {
        return referenceDataService.listAdminOwners();
    }

    @GetMapping("/users/active")
    public List<UserOptionResponse> activeUsers() {
        return referenceDataService.listActiveUsers();
    }
}
