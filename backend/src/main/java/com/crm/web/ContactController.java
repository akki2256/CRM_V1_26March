package com.crm.web;

import com.crm.service.ContactService;
import com.crm.web.dto.ContactCreateRequest;
import com.crm.web.dto.ContactCreateResponse;
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

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @PostMapping
    public ContactCreateResponse createContact(@Valid @RequestBody ContactCreateRequest request, Authentication authentication) {
        return contactService.create(request, authentication);
    }
}
