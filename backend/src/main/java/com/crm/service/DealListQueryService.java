package com.crm.service;

import com.crm.domain.AppUser;
import com.crm.domain.Contact;
import com.crm.domain.Deal;
import com.crm.domain.Stage;
import com.crm.repo.AppUserRepository;
import com.crm.repo.DealRepository;
import com.crm.repo.UserGroupRepository;
import com.crm.security.JwtUserPrincipal;
import com.crm.web.ApiException;
import com.crm.web.dto.ColumnFilterEntry;
import com.crm.web.dto.DealListRowDto;
import com.crm.web.dto.DealSearchRequest;
import com.crm.web.dto.PagedDealsResponse;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
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
public class DealListQueryService {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "dealId",
            "contactId",
            "contactName",
            "ownerName",
            "subOwnerName",
            "accountName",
            "dealUserId",
            "dealUserName",
            "closingDate",
            "stageId",
            "stageName",
            "amount",
            "dealDate",
            "pipeline",
            "currency",
            "purposeOfLoan",
            "dealComments");

    private static final Set<String> FILTERABLE_FIELDS = SORTABLE_FIELDS;

    private final DealRepository dealRepository;
    private final UserDirectoryService userDirectoryService;
    private final AppUserRepository appUserRepository;
    private final UserGroupRepository userGroupRepository;

    public DealListQueryService(
            DealRepository dealRepository,
            UserDirectoryService userDirectoryService,
            AppUserRepository appUserRepository,
            UserGroupRepository userGroupRepository) {
        this.dealRepository = dealRepository;
        this.userDirectoryService = userDirectoryService;
        this.appUserRepository = appUserRepository;
        this.userGroupRepository = userGroupRepository;
    }

    @Transactional(readOnly = true)
    public PagedDealsResponse search(DealSearchRequest request, Authentication authentication) {
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
        Sort sort = resolveSort(sortField, direction);
        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<Deal> spec = buildSpecification(visibilityModel, request.filters());
        Page<Deal> result = dealRepository.findAll(spec, pageable);

        List<DealListRowDto> rows = result.getContent().stream().map(this::toRow).toList();
        return new PagedDealsResponse(
                rows,
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber(),
                result.getSize());
    }

    @Transactional(readOnly = true)
    public Deal requireVisibleDeal(long dealId, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtUserPrincipal principal)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        Long userId = principal.getUserId();
        List<String> groups = userDirectoryService.groupNamesForUser(userId);
        VisibilityModel visibilityModel = resolveVisibility(userId, groups);

        Specification<Deal> spec = (root, query, cb) -> {
            Join<Deal, Contact> contact = root.join("contact", JoinType.INNER);
            root.join("dealUser", JoinType.INNER);
            root.join("stage", JoinType.INNER);
            return cb.and(
                    contactOwnershipVisibility(contact, cb, visibilityModel), cb.equal(root.get("dealId"), dealId));
        };
        List<Deal> found = dealRepository.findAll(spec);
        if (found.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Deal not found or not accessible.");
        }
        return found.getFirst();
    }

    private Sort resolveSort(String logicalField, Sort.Direction direction) {
        if ("dealUserName".equals(logicalField)) {
            return Sort.by(
                    new Sort.Order(direction, "dealUser.firstName").ignoreCase(),
                    new Sort.Order(direction, "dealUser.lastName").ignoreCase());
        }
        return Sort.by(direction, toSortProperty(logicalField));
    }

    private static String toSortProperty(String logical) {
        return switch (logical) {
            case "contactId" -> "contact.contactId";
            case "contactName" -> "contact.contactName";
            case "ownerName" -> "contact.ownerName";
            case "subOwnerName" -> "contact.subOwnerName";
            case "accountName" -> "contact.accountName";
            case "purposeOfLoan" -> "contact.purposeOfLoan";
            case "dealComments" -> "dealComments";
            case "dealUserId" -> "dealUser.userId";
            case "stageId" -> "stage.stageId";
            case "stageName" -> "stage.stageName";
            default -> logical;
        };
    }

    private Specification<Deal> buildSpecification(VisibilityModel visibility, List<ColumnFilterEntry> filters) {
        return (root, query, cb) -> {
            Join<Deal, Contact> contact = root.join("contact", JoinType.INNER);
            Join<Deal, AppUser> dealUser = root.join("dealUser", JoinType.INNER);
            Join<Deal, Stage> stage = root.join("stage", JoinType.INNER);

            List<Predicate> parts = new ArrayList<>();
            parts.add(contactOwnershipVisibility(contact, cb, visibility));

            Expression<String> dealUserFullName = dealUserFullNameExpr(dealUser, cb);

            for (ColumnFilterEntry f : filters) {
                if (f == null || f.column() == null || f.column().isBlank()) {
                    continue;
                }
                String col = f.column().trim();
                if (!FILTERABLE_FIELDS.contains(col)) {
                    continue;
                }
                Predicate p = columnFilterPredicate(root, contact, dealUser, stage, dealUserFullName, cb, col, f.op(), f.value());
                if (p != null) {
                    parts.add(p);
                }
            }
            return cb.and(parts.toArray(Predicate[]::new));
        };
    }

    private static Expression<String> dealUserFullNameExpr(Join<Deal, AppUser> dealUser, CriteriaBuilder cb) {
        Expression<String> fn = cb.coalesce(dealUser.get("firstName"), "");
        Expression<String> ln = cb.coalesce(dealUser.get("lastName"), "");
        return cb.trim(cb.concat(cb.concat(fn, " "), ln));
    }

    private Predicate columnFilterPredicate(
            Root<Deal> deal,
            Join<Deal, Contact> contact,
            Join<Deal, AppUser> dealUser,
            Join<Deal, Stage> stage,
            Expression<String> dealUserFullName,
            CriteriaBuilder cb,
            String field,
            String opRaw,
            String valueRaw) {
        String op = opRaw == null ? "" : opRaw.trim().toUpperCase(Locale.ROOT);
        String value = valueRaw == null ? "" : valueRaw.trim();

        if ("dealUserName".equals(field)) {
            return stringExpressionFilter(dealUserFullName, cb, op, value);
        }
        if ("dealId".equals(field)) {
            return longIdFilter(deal.get("dealId"), cb, op, value, "dealId");
        }
        if ("contactId".equals(field)) {
            return longIdFilter(contact.get("contactId"), cb, op, value, "contactId");
        }
        if ("dealUserId".equals(field)) {
            return longIdFilter(dealUser.get("userId"), cb, op, value, "dealUserId");
        }
        if ("stageId".equals(field)) {
            return longIdFilter(stage.get("stageId"), cb, op, value, "stageId");
        }
        if ("amount".equals(field)) {
            return amountFilter(deal.get("amount"), cb, op, value);
        }
        if ("closingDate".equals(field)) {
            return dateTimeFilter(deal.get("closingDate"), cb, op, value, "closingDate");
        }
        if ("dealDate".equals(field)) {
            return dateTimeFilter(deal.get("dealDate"), cb, op, value, "dealDate");
        }
        if ("contactName".equals(field)) {
            return stringPathFilter(contact.get("contactName"), cb, op, value);
        }
        if ("ownerName".equals(field)) {
            return stringPathFilter(contact.get("ownerName"), cb, op, value);
        }
        if ("subOwnerName".equals(field)) {
            return stringPathFilter(contact.get("subOwnerName"), cb, op, value);
        }
        if ("accountName".equals(field)) {
            return stringPathFilter(contact.get("accountName"), cb, op, value);
        }
        if ("stageName".equals(field)) {
            return stringPathFilter(stage.get("stageName"), cb, op, value);
        }
        if ("pipeline".equals(field)) {
            return stringPathFilter(deal.get("pipeline"), cb, op, value);
        }
        if ("currency".equals(field)) {
            return stringPathFilter(deal.get("currency"), cb, op, value);
        }
        if ("purposeOfLoan".equals(field)) {
            return stringPathFilter(contact.get("purposeOfLoan"), cb, op, value);
        }
        if ("dealComments".equals(field)) {
            return stringPathFilter(deal.get("dealComments"), cb, op, value);
        }
        return null;
    }

    private Predicate stringExpressionFilter(Expression<String> expr, CriteriaBuilder cb, String op, String value) {
        if ("IS_EMPTY".equals(op)) {
            return cb.or(cb.isNull(expr), cb.equal(cb.trim(expr), ""));
        }
        if ("IS_NOT_EMPTY".equals(op)) {
            return cb.and(cb.isNotNull(expr), cb.notEqual(cb.trim(expr), ""));
        }
        Expression<String> lower = cb.lower(expr);
        String vLower = value.toLowerCase(Locale.ROOT);
        String sanitized = vLower.replace("%", "").replace("_", "");
        return switch (op) {
            case "EQ" -> cb.equal(lower, vLower);
            case "CONTAINS" -> sanitized.isEmpty() ? null : cb.like(lower, "%" + sanitized + "%");
            case "STARTS_WITH" -> sanitized.isEmpty() ? null : cb.like(lower, sanitized + "%");
            case "ENDS_WITH" -> sanitized.isEmpty() ? null : cb.like(lower, "%" + sanitized);
            case "NE" -> cb.notEqual(lower, vLower);
            default -> null;
        };
    }

    private Predicate stringPathFilter(Expression<String> path, CriteriaBuilder cb, String op, String value) {
        return stringExpressionFilter(path, cb, op, value);
    }

    private Predicate longIdFilter(Expression<Long> path, CriteriaBuilder cb, String op, String value, String label) {
        if ("IS_EMPTY".equals(op)) {
            return cb.isNull(path);
        }
        if ("IS_NOT_EMPTY".equals(op)) {
            return cb.isNotNull(path);
        }
        if (value.isEmpty()) {
            return null;
        }
        long idVal;
        try {
            idVal = Long.parseLong(value);
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, label + " filter must be a number.");
        }
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

    private Predicate amountFilter(Expression<BigDecimal> path, CriteriaBuilder cb, String op, String value) {
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
            throw new ApiException(HttpStatus.BAD_REQUEST, "amount filter must be a number.");
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

    private Predicate dateTimeFilter(
            Expression<LocalDateTime> path, CriteriaBuilder cb, String op, String value, String label) {
        if ("IS_EMPTY".equals(op)) {
            return cb.isNull(path);
        }
        if ("IS_NOT_EMPTY".equals(op)) {
            return cb.isNotNull(path);
        }
        if (value.isEmpty()) {
            return null;
        }
        LocalDateTime start;
        LocalDateTime nextStart;
        try {
            if (value.contains("T")) {
                LocalDateTime parsed = LocalDateTime.parse(value);
                start = parsed;
                nextStart = parsed.plusNanos(1);
            } else {
                LocalDate day = LocalDate.parse(value);
                start = day.atStartOfDay(ZoneOffset.UTC).toLocalDateTime();
                nextStart = day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toLocalDateTime();
            }
        } catch (DateTimeParseException ex) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, label + " filter must be an ISO date (yyyy-MM-dd) or date-time.");
        }

        if (!value.contains("T")) {
            return switch (op) {
                case "EQ" -> cb.and(cb.greaterThanOrEqualTo(path, start), cb.lessThan(path, nextStart));
                case "NE" -> cb.or(cb.lessThan(path, start), cb.greaterThanOrEqualTo(path, nextStart));
                case "GT" -> cb.greaterThanOrEqualTo(path, nextStart);
                case "GTE" -> cb.greaterThanOrEqualTo(path, start);
                case "LT" -> cb.lessThan(path, start);
                case "LTE" -> cb.lessThan(path, nextStart);
                default -> cb.and(cb.greaterThanOrEqualTo(path, start), cb.lessThan(path, nextStart));
            };
        }
        return switch (op) {
            case "EQ" -> cb.equal(path, start);
            case "NE" -> cb.notEqual(path, start);
            case "GT" -> cb.greaterThan(path, start);
            case "LT" -> cb.lessThan(path, start);
            case "GTE" -> cb.greaterThanOrEqualTo(path, start);
            case "LTE" -> cb.lessThanOrEqualTo(path, start);
            default -> cb.equal(path, start);
        };
    }

    private DealListRowDto toRow(Deal d) {
        Contact c = d.getContact();
        AppUser u = d.getDealUser();
        Stage s = d.getStage();
        String dealUserName = (u.getFirstName() + " " + u.getLastName()).trim();
        String purpose = c.getPurposeOfLoan() == null ? "" : c.getPurposeOfLoan().trim();
        String comments = d.getDealComments() == null ? "" : d.getDealComments().trim();
        return new DealListRowDto(
                d.getDealId(),
                c.getContactId(),
                nullToDash(c.getContactName()),
                nullToDash(c.getOwnerName()),
                nullToDash(c.getSubOwnerName()),
                nullToDash(c.getAccountName()),
                u.getUserId(),
                dealUserName.isEmpty() ? "—" : dealUserName,
                d.getClosingDate() == null ? "" : d.getClosingDate().toString(),
                s.getStageId(),
                nullToDash(s.getStageName()),
                d.getAmount(),
                d.getDealDate() == null ? "" : d.getDealDate().toString(),
                d.getPipeline(),
                d.getCurrency(),
                purpose.isEmpty() ? "—" : purpose,
                comments.isEmpty() ? "—" : comments);
    }

    private static String nullToDash(String v) {
        if (v == null || v.isBlank()) {
            return "—";
        }
        return v.trim();
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
        var user = appUserRepository
                .findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
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
            return "dealId";
        }
        String trimmed = requested.trim();
        if (!SORTABLE_FIELDS.contains(trimmed)) {
            return "dealId";
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

    private static Predicate contactOwnershipVisibility(Join<Deal, Contact> contact, CriteriaBuilder cb, VisibilityModel v) {
        if (v.seeAll()) {
            return cb.conjunction();
        }
        if (v.matchableFullNames().isEmpty()) {
            return cb.disjunction();
        }
        Collection<String> names = v.matchableFullNames();
        return cb.or(
                contact.get("ownerName").in(names),
                contact.get("subOwnerName").in(names),
                contact.get("accountName").in(names));
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
