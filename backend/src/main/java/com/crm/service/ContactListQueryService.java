package com.crm.service;

import com.crm.domain.Contact;
import com.crm.repo.AppUserRepository;
import com.crm.repo.ContactRepository;
import com.crm.repo.UserGroupRepository;
import com.crm.security.JwtUserPrincipal;
import com.crm.web.ApiException;
import com.crm.web.dto.ColumnFilterEntry;
import com.crm.web.dto.ContactListRowDto;
import com.crm.web.dto.ContactSearchRequest;
import com.crm.web.dto.DealContactOptionResponse;
import com.crm.web.dto.PagedContactsResponse;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContactListQueryService {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "contactId",
            "agentEmail",
            "contactName",
            "countryCode",
            "phoneNumber",
            "email",
            "productCode",
            "purposeOfLoan",
            "addressText",
            "customerIncome",
            "employmentStatusCode",
            "mortgageYn",
            "otherExistingLoansYn",
            "creditCardYn",
            "typeCode",
            "segmentCode",
            "statusCode",
            "labelCode",
            "ownerName",
            "subOwnerName",
            "accountName");

    private static final Set<String> FILTERABLE_FIELDS = SORTABLE_FIELDS;

    private final ContactRepository contactRepository;
    private final UserDirectoryService userDirectoryService;
    private final AppUserRepository appUserRepository;
    private final UserGroupRepository userGroupRepository;

    public ContactListQueryService(
            ContactRepository contactRepository,
            UserDirectoryService userDirectoryService,
            AppUserRepository appUserRepository,
            UserGroupRepository userGroupRepository) {
        this.contactRepository = contactRepository;
        this.userDirectoryService = userDirectoryService;
        this.appUserRepository = appUserRepository;
        this.userGroupRepository = userGroupRepository;
    }

    @Transactional(readOnly = true)
    public Specification<Contact> visibilitySpecification(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtUserPrincipal principal)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        Long userId = principal.getUserId();
        List<String> groups = userDirectoryService.groupNamesForUser(userId);
        VisibilityModel visibilityModel = resolveVisibility(userId, groups);
        return (root, query, cb) -> visibilityPredicate(root, cb, visibilityModel);
    }

    @Transactional(readOnly = true)
    public PagedContactsResponse search(ContactSearchRequest request, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtUserPrincipal principal)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        Long userId = principal.getUserId();
        List<String> groups = userDirectoryService.groupNamesForUser(userId);
        VisibilityModel visibilityModel = resolveVisibility(userId, groups);

        int page = request.page() == null || request.page() < 0 ? 0 : request.page();
        int size = request.size() == null ? 10 : Math.min(50, Math.max(1, request.size()));
        String sortField = normalizeSortField(request.sortField());
        Sort.Direction direction = parseDirection(request.sortDirection());
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        Specification<Contact> spec = buildSpecification(visibilityModel, request.filters());
        Page<Contact> result = contactRepository.findAll(spec, pageable);

        List<ContactListRowDto> rows = result.getContent().stream().map(this::toRow).toList();
        return new PagedContactsResponse(
                rows,
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber(),
                result.getSize());
    }

    @Transactional(readOnly = true)
    public List<DealContactOptionResponse> listContactsForDealForm(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtUserPrincipal principal)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        Long userId = principal.getUserId();
        List<String> groups = userDirectoryService.groupNamesForUser(userId);
        VisibilityModel visibilityModel = resolveVisibility(userId, groups);
        Specification<Contact> spec = buildSpecification(visibilityModel, List.of());
        List<Contact> contacts = contactRepository.findAll(spec, Sort.by(Sort.Direction.ASC, "contactName"));
        return contacts.stream().map(ContactListQueryService::toDealContactOption).toList();
    }

    private static DealContactOptionResponse toDealContactOption(Contact c) {
        String name = c.getContactName() == null ? "" : c.getContactName().trim();
        String purpose = c.getPurposeOfLoan() == null ? "" : c.getPurposeOfLoan().trim();
        String account = c.getAccountName() == null ? "" : c.getAccountName().trim();
        return new DealContactOptionResponse(c.getContactId(), name, purpose, account);
    }

    @Transactional(readOnly = true)
    public Contact requireVisibleContact(long contactId, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtUserPrincipal principal)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        Long userId = principal.getUserId();
        List<String> groups = userDirectoryService.groupNamesForUser(userId);
        VisibilityModel visibilityModel = resolveVisibility(userId, groups);
        Specification<Contact> spec = (root, query, cb) -> cb.and(
                visibilityPredicate(root, cb, visibilityModel), cb.equal(root.get("contactId"), contactId));
        Page<Contact> page = contactRepository.findAll(spec, PageRequest.of(0, 1));
        if (page.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Contact not found or not accessible.");
        }
        return page.getContent().getFirst();
    }

    private VisibilityModel resolveVisibility(Long userId, List<String> groups) {
        boolean admin = containsIgnoreCase(groups, "admin");
        boolean manager = containsIgnoreCase(groups, "manager");
        if (admin || manager) {
            return VisibilityModel.unrestricted();
        }
        boolean lead = containsIgnoreCase(groups, "lead");
        boolean agent = containsIgnoreCase(groups, "agent");
        if (!lead && !agent) {
            return VisibilityModel.restrictedToNames(Set.of());
        }
        var user =
                appUserRepository.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
        String myFullName = user.getFirstName() + " " + user.getLastName();
        if (lead) {
            List<Long> peerIds = userGroupRepository.findUserIdsSharingAnyGroupWith(userId);
            List<String> names =
                    peerIds.isEmpty() ? List.of(myFullName) : appUserRepository.findDistinctFullNamesByUserIds(peerIds);
            return VisibilityModel.restrictedToNames(new HashSet<>(names));
        }
        return VisibilityModel.restrictedToNames(Set.of(myFullName));
    }

    private static boolean containsIgnoreCase(List<String> groups, String needle) {
        return groups.stream().anyMatch(g -> g != null && g.equalsIgnoreCase(needle));
    }

    private String normalizeSortField(String requested) {
        if (requested == null || requested.isBlank()) {
            return "contactId";
        }
        String trimmed = requested.trim();
        if (!SORTABLE_FIELDS.contains(trimmed)) {
            return "contactId";
        }
        return trimmed;
    }

    private static Sort.Direction parseDirection(String raw) {
        if (raw == null || raw.isBlank()) {
            return Sort.Direction.DESC;
        }
        try {
            return Sort.Direction.fromString(raw.trim());
        } catch (IllegalArgumentException ex) {
            return Sort.Direction.DESC;
        }
    }

    private Specification<Contact> buildSpecification(VisibilityModel visibility, List<ColumnFilterEntry> filters) {
        return (root, query, cb) -> {
            List<Predicate> parts = new ArrayList<>();
            parts.add(visibilityPredicate(root, cb, visibility));
            for (ColumnFilterEntry f : filters) {
                if (f == null || f.column() == null || f.column().isBlank()) {
                    continue;
                }
                String col = f.column().trim();
                if (!FILTERABLE_FIELDS.contains(col)) {
                    continue;
                }
                Predicate p = columnFilterPredicate(root, cb, col, f.op(), f.value());
                if (p != null) {
                    parts.add(p);
                }
            }
            return cb.and(parts.toArray(Predicate[]::new));
        };
    }

    private static Predicate visibilityPredicate(Root<Contact> root, CriteriaBuilder cb, VisibilityModel v) {
        if (v.seeAll()) {
            return cb.conjunction();
        }
        if (v.matchableFullNames().isEmpty()) {
            return cb.disjunction();
        }
        Collection<String> names = v.matchableFullNames();
        return cb.or(root.get("ownerName").in(names), root.get("subOwnerName").in(names), root.get("accountName").in(names));
    }

    private Predicate columnFilterPredicate(Root<Contact> root, CriteriaBuilder cb, String field, String opRaw, String valueRaw) {
        String op = opRaw == null ? "" : opRaw.trim().toUpperCase(Locale.ROOT);
        String value = valueRaw == null ? "" : valueRaw.trim();

        if ("IS_EMPTY".equals(op)) {
            if ("customerIncome".equals(field) || "contactId".equals(field)) {
                return cb.isNull(root.get(field));
            }
            Expression<String> str = stringPath(root, field);
            return cb.or(cb.isNull(str), cb.equal(cb.trim(str), ""));
        }
        if ("IS_NOT_EMPTY".equals(op)) {
            if ("customerIncome".equals(field) || "contactId".equals(field)) {
                return cb.isNotNull(root.get(field));
            }
            Expression<String> str = stringPath(root, field);
            return cb.and(cb.isNotNull(str), cb.notEqual(cb.trim(str), ""));
        }

        if ("contactId".equals(field)) {
            return numericIdPredicate(root, cb, op, value);
        }
        if ("customerIncome".equals(field)) {
            return incomePredicate(root, cb, op, value);
        }
        if ("mortgageYn".equals(field)
                || "otherExistingLoansYn".equals(field)
                || "creditCardYn".equals(field)) {
            return ynPredicate(root, cb, field, op, value);
        }

        Expression<String> str = stringPath(root, field);
        Expression<String> lower = cb.lower(str);
        String vLower = value.toLowerCase(Locale.ROOT);
        String sanitized = vLower.replace("%", "").replace("_", "");

        return switch (op) {
            case "EQ" -> cb.equal(lower, vLower);
            case "CONTAINS" -> sanitized.isEmpty()
                    ? null
                    : cb.like(lower, "%" + sanitized + "%");
            case "STARTS_WITH" -> sanitized.isEmpty()
                    ? null
                    : cb.like(lower, sanitized + "%");
            case "ENDS_WITH" -> sanitized.isEmpty()
                    ? null
                    : cb.like(lower, "%" + sanitized);
            case "NE" -> cb.notEqual(lower, vLower);
            default -> null;
        };
    }

    private static Expression<String> stringPath(Root<Contact> root, String field) {
        return root.get(field);
    }

    private Predicate numericIdPredicate(Root<Contact> root, CriteriaBuilder cb, String op, String value) {
        if (value.isEmpty()) {
            return null;
        }
        long idVal;
        try {
            idVal = Long.parseLong(value);
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "contactId filter must be a number.");
        }
        Expression<Long> path = root.get("contactId");
        return switch (op) {
            case "EQ" -> cb.equal(path, idVal);
            case "NE" -> cb.notEqual(path, idVal);
            case "GT" -> cb.gt(path, idVal);
            case "LT" -> cb.lt(path, idVal);
            case "GTE" -> cb.ge(path, idVal);
            case "LTE" -> cb.le(path, idVal);
            default -> cb.equal(path, idVal);
        };
    }

    private Predicate incomePredicate(Root<Contact> root, CriteriaBuilder cb, String op, String value) {
        Expression<BigDecimal> path = root.get("customerIncome");
        if ("IS_EMPTY".equals(op)) {
            return cb.isNull(path);
        }
        if ("IS_NOT_EMPTY".equals(op)) {
            return cb.isNotNull(path);
        }
        if (value.isEmpty()) {
            return null;
        }
        BigDecimal dec;
        try {
            dec = new BigDecimal(value);
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "customerIncome filter must be a number.");
        }
        return switch (op) {
            case "EQ" -> cb.equal(path, dec);
            case "NE" -> cb.notEqual(path, dec);
            case "GT" -> cb.gt(path, dec);
            case "LT" -> cb.lt(path, dec);
            case "GTE" -> cb.ge(path, dec);
            case "LTE" -> cb.le(path, dec);
            default -> cb.equal(path, dec);
        };
    }

    private Predicate ynPredicate(Root<Contact> root, CriteriaBuilder cb, String field, String op, String value) {
        Expression<String> path = root.get(field);
        if ("IS_EMPTY".equals(op)) {
            return cb.or(cb.isNull(path), cb.equal(path, ""));
        }
        if ("IS_NOT_EMPTY".equals(op)) {
            return cb.and(cb.isNotNull(path), cb.notEqual(path, ""));
        }
        String normalized = normalizeYnFilter(value);
        if (normalized == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yes/No filters must use Yes, No, Y, or N.");
        }
        if ("NE".equals(op)) {
            return cb.notEqual(path, normalized);
        }
        return cb.equal(path, normalized);
    }

    private static String normalizeYnFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim();
        if (v.equalsIgnoreCase("yes") || v.equalsIgnoreCase("y")) {
            return "Y";
        }
        if (v.equalsIgnoreCase("no") || v.equalsIgnoreCase("n")) {
            return "N";
        }
        return null;
    }

    private ContactListRowDto toRow(Contact c) {
        return new ContactListRowDto(
                c.getContactId(),
                c.getAgentEmail(),
                c.getContactName(),
                c.getCountryCode(),
                c.getPhoneNumber(),
                c.getEmail(),
                c.getProductCode(),
                c.getPurposeOfLoan(),
                c.getAddressText(),
                c.getCustomerIncome(),
                c.getEmploymentStatusCode(),
                c.getMortgageYn(),
                c.getOtherExistingLoansYn(),
                c.getCreditCardYn(),
                c.getTypeCode(),
                c.getSegmentCode(),
                c.getStatusCode(),
                c.getLabelCode(),
                c.getOwnerName(),
                c.getSubOwnerName(),
                c.getAccountName());
    }

    private record VisibilityModel(boolean seeAll, Set<String> matchableFullNames) {
        static VisibilityModel unrestricted() {
            return new VisibilityModel(true, Set.of());
        }

        static VisibilityModel restrictedToNames(Set<String> matchableFullNames) {
            return new VisibilityModel(false, matchableFullNames);
        }
    }
}
