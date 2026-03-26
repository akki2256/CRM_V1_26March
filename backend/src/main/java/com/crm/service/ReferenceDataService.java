package com.crm.service;

import com.crm.domain.CodeReference;
import com.crm.repo.AppUserRepository;
import com.crm.repo.CodeReferenceRepository;
import com.crm.web.dto.CodeReferenceItemResponse;
import com.crm.web.dto.UserOptionResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReferenceDataService {

    private final CodeReferenceRepository codeReferenceRepository;
    private final AppUserRepository appUserRepository;

    public ReferenceDataService(CodeReferenceRepository codeReferenceRepository, AppUserRepository appUserRepository) {
        this.codeReferenceRepository = codeReferenceRepository;
        this.appUserRepository = appUserRepository;
    }

    @Transactional(readOnly = true)
    public List<CodeReferenceItemResponse> listCodesByCategory(String categorySid) {
        return codeReferenceRepository.findByCategorySidOrderBySequenceNoAsc(categorySid).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserOptionResponse> listAdminOwners() {
        return appUserRepository.findDistinctAdminFullNames().stream()
                .map(UserOptionResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserOptionResponse> listActiveUsers() {
        return appUserRepository.findDistinctActiveFullNames().stream()
                .map(UserOptionResponse::new)
                .toList();
    }

    private CodeReferenceItemResponse toDto(CodeReference row) {
        return new CodeReferenceItemResponse(row.getCode(), row.getSequenceNo());
    }
}
