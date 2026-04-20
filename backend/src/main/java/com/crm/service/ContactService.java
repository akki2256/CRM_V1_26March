package com.crm.service;

import com.crm.domain.Contact;
import com.crm.security.JwtUserPrincipal;
import com.crm.repo.ContactRepository;
import com.crm.web.ApiException;
import com.crm.web.dto.ContactCreateRequest;
import com.crm.web.dto.ContactCreateResponse;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContactService {

    private final ContactRepository contactRepository;

    public ContactService(ContactRepository contactRepository) {
        this.contactRepository = contactRepository;
    }

    @Transactional
    public ContactCreateResponse create(ContactCreateRequest request, Authentication authentication) {
        String actor = "SYSTEM";
        if (authentication != null && authentication.getPrincipal() instanceof JwtUserPrincipal p) {
            actor = p.getUsername();
        }

        Contact contact = new Contact();
        contact.setAgentEmail(request.agentEmail().trim().toLowerCase());
        contact.setContactName(request.name().trim());
        contact.setCountryCode(request.countryCode().trim());
        contact.setPhoneNumber(request.phoneNumber().trim());
        contact.setEmail(request.email().trim().toLowerCase());
        contact.setProductCode(blankToNull(request.product()));
        contact.setPurposeOfLoan(request.purposeOfLoan().trim());
        contact.setAddressText(blankToNull(request.address()));
        contact.setCustomerIncome(parseIncome(request.income()));
        contact.setEmploymentStatusCode(request.employmentStatus().trim());
        contact.setMortgageYn(toYn(request.mortgage()));
        contact.setOtherExistingLoansYn(toYn(request.otherExistingLoans()));
        contact.setCreditCardYn(toYn(request.creditCard()));
        contact.setTypeCode(blankToNull(request.type()));
        contact.setSegmentCode(blankToNull(request.segment()));
        contact.setStatusCode(blankToNull(request.status()));
        contact.setLabelCode(blankToNull(request.label()));
        contact.setOwnerName(blankToNull(request.owner()));
        contact.setSubOwnerName(blankToNull(request.subOwner()));
        contact.setAccountName(blankToNull(request.account()));

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        contact.setCreatedDt(now);
        contact.setCreatedBy(actor);
        contact.setLastUpdDt(now);
        contact.setLastUpdBy(actor);
        contact.setOcaControl(0L);

        contactRepository.save(contact);
        return new ContactCreateResponse(contact.getContactId(), "Contact created successfully.");
    }

    private static String toYn(String value) {
        return "Yes".equalsIgnoreCase(value) ? "Y" : "N";
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static BigDecimal parseIncome(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) {
            return null;
        }
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Income must be a valid number.");
        }
    }
}
