package com.crm.service;

import com.crm.domain.Contact;
import com.crm.repo.ContactRepository;
import com.crm.security.JwtUserPrincipal;
import com.crm.web.ApiException;
import com.crm.web.dto.ContactBulkUploadRequest;
import com.crm.web.dto.ContactBulkUploadResponse;
import com.crm.web.dto.ContactBulkUploadRowRequest;
import com.crm.web.dto.ContactCreateRequest;
import com.crm.web.dto.ContactCreateResponse;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
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

    @Transactional
    public ContactBulkUploadResponse bulkUpload(ContactBulkUploadRequest request, Authentication authentication) {
        if (request == null || request.rows() == null || request.rows().isEmpty()) {
            return new ContactBulkUploadResponse(false, 0, List.of("No rows found to upload."));
        }
        String actor = actorUsername(authentication);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<String> errors = new ArrayList<>();
        List<Contact> toSave = new ArrayList<>();
        int idx = 1;
        for (ContactBulkUploadRowRequest row : request.rows()) {
            validateAndBuildRow(row, idx, actor, now, errors, toSave);
            idx += 1;
        }
        if (!errors.isEmpty()) {
            return new ContactBulkUploadResponse(false, 0, errors);
        }
        contactRepository.saveAll(toSave);
        return new ContactBulkUploadResponse(true, toSave.size(), List.of());
    }

    private void validateAndBuildRow(
            ContactBulkUploadRowRequest row,
            int rowNumber,
            String actor,
            LocalDateTime now,
            List<String> errors,
            List<Contact> toSave) {
        int errorsBefore = errors.size();
        if (row == null) {
            errors.add("Row " + rowNumber + ": empty row.");
            return;
        }

        String agentEmail = trimToEmpty(row.agentEmail());
        String name = trimToEmpty(row.name());
        String countryCode = trimToEmpty(row.countryCode());
        String phoneNumber = trimToEmpty(row.phoneNumber());
        String email = trimToEmpty(row.email());
        String purposeOfLoan = trimToEmpty(row.purposeOfLoan());
        String employmentStatus = trimToEmpty(row.employmentStatus());
        String mortgage = trimToEmpty(row.mortgage());
        String otherExistingLoans = trimToEmpty(row.otherExistingLoans());
        String creditCard = trimToEmpty(row.creditCard());

        if (!agentEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            errors.add("Row " + rowNumber + ": Agent email is invalid.");
        }
        if (!name.matches("^[A-Za-z ]+$")) {
            errors.add("Row " + rowNumber + ": Name can contain only letters and spaces.");
        }
        if (!countryCode.matches("^[0-9]+$")) {
            errors.add("Row " + rowNumber + ": Country code must contain digits only.");
        }
        if (!phoneNumber.matches("^[0-9]+$")) {
            errors.add("Row " + rowNumber + ": Phone number must contain digits only.");
        }
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            errors.add("Row " + rowNumber + ": Contact email is invalid.");
        }
        if (purposeOfLoan.isEmpty()) {
            errors.add("Row " + rowNumber + ": Purpose of loan is required.");
        }
        if (employmentStatus.isEmpty()) {
            errors.add("Row " + rowNumber + ": Employment status is required.");
        }
        if (!isYesOrNo(mortgage)) {
            errors.add("Row " + rowNumber + ": Mortgage must be Yes or No.");
        }
        if (!isYesOrNo(otherExistingLoans)) {
            errors.add("Row " + rowNumber + ": Other existing loans must be Yes or No.");
        }
        if (!isYesOrNo(creditCard)) {
            errors.add("Row " + rowNumber + ": Credit card must be Yes or No.");
        }
        if (!isBlankOrAllowed(row.type(), "People", "Organization")) {
            errors.add("Row " + rowNumber + ": Type must be People or Organization.");
        }
        if (!isBlankOrAllowed(row.segment(), "Master List", "Online")) {
            errors.add("Row " + rowNumber + ": Segment must be Master List or Online.");
        }
        if (!isBlankOrAllowed(row.status(), "Active", "Inactive")) {
            errors.add("Row " + rowNumber + ": Status must be Active or Inactive.");
        }
        BigDecimal income = null;
        try {
            income = parseIncome(row.income());
        } catch (ApiException ex) {
            errors.add("Row " + rowNumber + ": Income must be a valid number.");
        }

        if (errors.size() > errorsBefore) {
            return;
        }

        Contact contact = new Contact();
        contact.setAgentEmail(agentEmail.toLowerCase());
        contact.setContactName(name);
        contact.setCountryCode(countryCode);
        contact.setPhoneNumber(phoneNumber);
        contact.setEmail(email.toLowerCase());
        contact.setProductCode(blankToNull(row.product()));
        contact.setPurposeOfLoan(purposeOfLoan);
        contact.setAddressText(blankToNull(row.address()));
        contact.setCustomerIncome(income);
        contact.setEmploymentStatusCode(employmentStatus);
        contact.setMortgageYn(toYn(mortgage));
        contact.setOtherExistingLoansYn(toYn(otherExistingLoans));
        contact.setCreditCardYn(toYn(creditCard));
        contact.setTypeCode(blankToNull(row.type()));
        contact.setSegmentCode(blankToNull(row.segment()));
        contact.setStatusCode(blankToNull(row.status()));
        contact.setLabelCode(blankToNull(row.label()));
        contact.setOwnerName(blankToNull(row.owner()));
        contact.setSubOwnerName(blankToNull(row.subOwner()));
        contact.setAccountName(blankToNull(row.account()));
        contact.setCreatedDt(now);
        contact.setCreatedBy(actor);
        contact.setLastUpdDt(now);
        contact.setLastUpdBy(actor);
        contact.setOcaControl(0L);
        toSave.add(contact);
    }

    private static String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private static boolean isYesOrNo(String value) {
        return "Yes".equalsIgnoreCase(value) || "No".equalsIgnoreCase(value);
    }

    private static boolean isBlankOrAllowed(String value, String a, String b) {
        String trimmed = trimToEmpty(value);
        if (trimmed.isEmpty()) {
            return true;
        }
        return trimmed.equalsIgnoreCase(a) || trimmed.equalsIgnoreCase(b);
    }

    private static String actorUsername(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof JwtUserPrincipal p) {
            return p.getUsername();
        }
        return "SYSTEM";
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
