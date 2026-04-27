package com.crm.web;

import com.crm.service.ContactListQueryService;
import com.crm.service.ContactService;
import com.crm.web.dto.ContactCreateRequest;
import com.crm.web.dto.ContactCreateResponse;
import com.crm.web.dto.ContactBulkUploadRequest;
import com.crm.web.dto.ContactBulkUploadResponse;
import com.crm.web.dto.ContactSearchRequest;
import com.crm.web.dto.PagedContactsResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    private final ContactService contactService;
    private final ContactListQueryService contactListQueryService;

    public ContactController(ContactService contactService, ContactListQueryService contactListQueryService) {
        this.contactService = contactService;
        this.contactListQueryService = contactListQueryService;
    }

    @PostMapping
    public ContactCreateResponse createContact(@Valid @RequestBody ContactCreateRequest request, Authentication authentication) {
        return contactService.create(request, authentication);
    }

    @PostMapping("/search")
    public PagedContactsResponse searchContacts(@RequestBody ContactSearchRequest request, Authentication authentication) {
        return contactListQueryService.search(request, authentication);
    }

    @PostMapping("/bulk-upload")
    public ContactBulkUploadResponse bulkUpload(
            @RequestBody ContactBulkUploadRequest request, Authentication authentication) {
        return contactService.bulkUpload(request, authentication);
    }
}
