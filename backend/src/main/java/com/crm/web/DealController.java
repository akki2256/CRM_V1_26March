package com.crm.web;

import com.crm.service.DealListQueryService;
import com.crm.service.DealService;
import com.crm.web.dto.DealAccountPatchRequest;
import com.crm.web.dto.DealAttachmentRowDto;
import com.crm.web.dto.DealContactPatchRequest;
import com.crm.web.dto.DealCreateRequest;
import com.crm.web.dto.DealCreateResponse;
import com.crm.web.dto.DealDetailResponse;
import com.crm.web.dto.DealFormOptionsResponse;
import com.crm.web.dto.DealSearchRequest;
import com.crm.web.dto.DealStagePatchRequest;
import com.crm.web.dto.PagedDealsResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/deals")
public class DealController {

    private final DealService dealService;
    private final DealListQueryService dealListQueryService;

    public DealController(DealService dealService, DealListQueryService dealListQueryService) {
        this.dealService = dealService;
        this.dealListQueryService = dealListQueryService;
    }

    @GetMapping("/form-options")
    public DealFormOptionsResponse formOptions(Authentication authentication) {
        return dealService.formOptions(authentication);
    }

    @PostMapping
    public DealCreateResponse create(@Valid @RequestBody DealCreateRequest request, Authentication authentication) {
        return dealService.create(request, authentication);
    }

    @PostMapping("/search")
    public PagedDealsResponse searchDeals(@RequestBody DealSearchRequest request, Authentication authentication) {
        return dealListQueryService.search(request, authentication);
    }

    @GetMapping("/detail/{dealId}")
    public DealDetailResponse getDetail(@PathVariable long dealId, Authentication authentication) {
        return dealService.getDetail(dealId, authentication);
    }

    @PatchMapping("/detail/{dealId}/stage")
    public void patchStage(
            @PathVariable long dealId,
            @Valid @RequestBody DealStagePatchRequest request,
            Authentication authentication) {
        dealService.updateStage(dealId, request, authentication);
    }

    @PatchMapping("/detail/{dealId}/contact")
    public void patchContact(
            @PathVariable long dealId,
            @Valid @RequestBody DealContactPatchRequest request,
            Authentication authentication) {
        dealService.updateContact(dealId, request, authentication);
    }

    @PatchMapping("/detail/{dealId}/account")
    public void patchAccount(
            @PathVariable long dealId,
            @Valid @RequestBody DealAccountPatchRequest request,
            Authentication authentication) {
        dealService.updateAccount(dealId, request, authentication);
    }

    @GetMapping("/detail/{dealId}/attachments")
    public List<DealAttachmentRowDto> listAttachments(@PathVariable long dealId, Authentication authentication) {
        return dealService.listAttachments(dealId, authentication);
    }

    @PostMapping(value = "/detail/{dealId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DealAttachmentRowDto uploadAttachment(
            @PathVariable long dealId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        return dealService.addAttachment(dealId, file, authentication);
    }
}
