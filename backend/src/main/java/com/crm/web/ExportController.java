package com.crm.web;

import com.crm.domain.AppUser;
import com.crm.repo.AppUserRepository;
import com.crm.security.JwtUserPrincipal;
import com.crm.service.MailNotificationService;
import com.crm.web.dto.ExportEmailRequest;
import jakarta.validation.Valid;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exports")
public class ExportController {

    private final AppUserRepository appUserRepository;
    private final MailNotificationService mailNotificationService;

    public ExportController(AppUserRepository appUserRepository, MailNotificationService mailNotificationService) {
        this.appUserRepository = appUserRepository;
        this.mailNotificationService = mailNotificationService;
    }

    @PostMapping("/email")
    public void emailExport(Authentication authentication, @Valid @RequestBody ExportEmailRequest request) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtUserPrincipal principal)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Sign in required.");
        }
        AppUser user = appUserRepository.findById(principal.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(request.base64Content());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid export payload.");
        }
        try {
            mailNotificationService.sendExportAttachment(
                    user.getEmail(),
                    user.getFirstName(),
                    request.fileName(),
                    request.mimeType(),
                    bytes);
        } catch (IllegalStateException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
}
