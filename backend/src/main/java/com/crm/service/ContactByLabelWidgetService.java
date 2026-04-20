package com.crm.service;

import com.crm.domain.Contact;
import com.crm.web.ApiException;
import com.crm.web.dto.ContactByLabelResponse;
import com.crm.web.dto.ContactByLabelSliceDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dashboard "Contact by Label" aggregation. Reads only the {@link Contact} entity (table {@code CONTACT}):
 * each row is counted once using {@code label_code}, with the same visibility rules as the contacts list.
 * The {@code DEAL} table is never queried.
 */
@Service
public class ContactByLabelWidgetService {

    private static final Map<String, String> BUCKET_LABELS = Map.of(
            "hot", "Hot Deals",
            "warm", "Warm Deals",
            "cold", "Cold Deals",
            "other", "Others");

    /** API slice order: matches CONTACT.label_code groups (hot / warm / cold; else others). */
    private static final List<String> BUCKET_ORDER = List.of("hot", "warm", "cold", "other");

    private final EntityManager entityManager;
    private final ContactListQueryService contactListQueryService;

    public ContactByLabelWidgetService(EntityManager entityManager, ContactListQueryService contactListQueryService) {
        this.entityManager = entityManager;
        this.contactListQueryService = contactListQueryService;
    }

    /**
     * Groups visible {@link Contact} rows by {@code CONTACT.label_code}: hot, warm, cold (case-insensitive
     * after trim); all other non-empty values and blank label fall into {@code others}.
     * Optional period narrows rows by {@code CONTACT.created_dt} (UTC).
     */
    @Transactional(readOnly = true)
    public ContactByLabelResponse aggregate(Authentication authentication, String periodRaw) {
        Specification<Contact> visibilitySpec = contactListQueryService.visibilitySpecification(authentication);
        String period = periodRaw == null ? "LAST_MONTH" : periodRaw.trim().toUpperCase(Locale.ROOT);
        OptionalDateRange range = resolvePeriod(period);

        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> cq = cb.createTupleQuery();
        Root<Contact> root = cq.from(Contact.class); // CONTACT only — no join to DEAL

        Expression<String> trimmed = cb.trim(cb.coalesce(root.get("labelCode"), ""));
        Expression<String> upperLbl = cb.upper(trimmed);
        // LABEL_CODE: hot / warm / cold (any casing); anything else → other (includes blank).
        Expression<String> bucket = cb.<String>selectCase()
                .when(cb.equal(trimmed, ""), "other")
                .when(cb.equal(upperLbl, "HOT"), "hot")
                .when(cb.equal(upperLbl, "WARM"), "warm")
                .when(cb.equal(upperLbl, "COLD"), "cold")
                .otherwise("other");

        Predicate visibilityPredicate = visibilitySpec.toPredicate(root, cq, cb);
        Predicate datePredicate = range == null ? cb.conjunction() : range.toPredicate(root, cb);
        cq.where(cb.and(visibilityPredicate, datePredicate));
        cq.multiselect(bucket.alias("bucket"), cb.countDistinct(root.get("contactId")).alias("cnt"));
        cq.groupBy(bucket);

        List<Tuple> rows = entityManager.createQuery(cq).getResultList();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String b : BUCKET_ORDER) {
            counts.put(b, 0L);
        }
        for (Tuple t : rows) {
            String b = (String) t.get("bucket");
            Object rawCnt = t.get("cnt");
            if (b == null || rawCnt == null) {
                continue;
            }
            long c = rawCnt instanceof Number n ? n.longValue() : 0L;
            String key = b.toLowerCase(Locale.ROOT);
            if (!counts.containsKey(key)) {
                key = "other";
            }
            counts.put(key, counts.getOrDefault(key, 0L) + c);
        }
        long total = counts.values().stream().mapToLong(Long::longValue).sum();

        List<ContactByLabelSliceDto> slices = new ArrayList<>();
        for (String b : BUCKET_ORDER) {
            long n = counts.getOrDefault(b, 0L);
            slices.add(new ContactByLabelSliceDto(b, BUCKET_LABELS.getOrDefault(b, b), n));
        }
        return new ContactByLabelResponse(slices, total);
    }

    private OptionalDateRange resolvePeriod(String period) {
        ZoneOffset z = ZoneOffset.UTC;
        LocalDate today = LocalDate.now(z);
        LocalDateTime now = LocalDateTime.now(z);
        return switch (period) {
            case "ALL" -> null;
            case "LAST_7_DAYS" -> new OptionalDateRange(now.minusDays(7), now.plusNanos(1));
            case "THIS_MONTH" -> {
                LocalDateTime start = today.withDayOfMonth(1).atStartOfDay(z).toLocalDateTime();
                LocalDateTime end =
                        YearMonth.from(today).plusMonths(1).atDay(1).atStartOfDay(z).toLocalDateTime();
                yield new OptionalDateRange(start, end);
            }
            case "LAST_MONTH" -> {
                YearMonth prev = YearMonth.from(today).minusMonths(1);
                LocalDateTime start = prev.atDay(1).atStartOfDay(z).toLocalDateTime();
                LocalDateTime end = prev.plusMonths(1).atDay(1).atStartOfDay(z).toLocalDateTime();
                yield new OptionalDateRange(start, end);
            }
            case "YTD" -> {
                LocalDateTime start = today.withDayOfYear(1).atStartOfDay(z).toLocalDateTime();
                LocalDateTime end = today.plusDays(1).atStartOfDay(z).toLocalDateTime();
                yield new OptionalDateRange(start, end);
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown period. Use LAST_7_DAYS, LAST_MONTH, THIS_MONTH, YTD, or ALL.");
        };
    }

    private record OptionalDateRange(LocalDateTime startInclusive, LocalDateTime endExclusive) {
        Predicate toPredicate(Root<Contact> root, CriteriaBuilder cb) {
            return cb.and(
                    cb.greaterThanOrEqualTo(root.get("createdDt"), startInclusive),
                    cb.lessThan(root.get("createdDt"), endExclusive));
        }
    }
}
