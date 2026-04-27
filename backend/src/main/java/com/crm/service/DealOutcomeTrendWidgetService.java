package com.crm.service;

import com.crm.domain.Deal;
import com.crm.repo.DealRepository;
import com.crm.web.ApiException;
import com.crm.web.dto.DealOutcomeTrendPointDto;
import com.crm.web.dto.DealOutcomeTrendResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DealOutcomeTrendWidgetService {

    private final DealRepository dealRepository;
    private final DealListQueryService dealListQueryService;

    public DealOutcomeTrendWidgetService(DealRepository dealRepository, DealListQueryService dealListQueryService) {
        this.dealRepository = dealRepository;
        this.dealListQueryService = dealListQueryService;
    }

    @Transactional(readOnly = true)
    public DealOutcomeTrendResponse aggregate(Authentication authentication, String periodRaw) {
        String period = periodRaw == null ? "LAST_MONTH" : periodRaw.trim().toUpperCase(Locale.ROOT);
        OptionalDateRange range = resolvePeriod(period);
        Specification<Deal> visibility = dealListQueryService.visibilitySpecification(authentication);
        List<Deal> visibleDeals = dealRepository.findAll(visibility);

        Map<LocalDate, long[]> daily = new LinkedHashMap<>();
        for (Deal deal : visibleDeals) {
            if (deal.getDealDate() == null || deal.getStage() == null || deal.getStage().getStageName() == null) {
                continue;
            }
            if (!range.includes(deal.getDealDate())) {
                continue;
            }
            String stageName = deal.getStage().getStageName().trim().toLowerCase(Locale.ROOT);
            if (!"closed won".equals(stageName) && !"closed lost".equals(stageName)) {
                continue;
            }
            LocalDate day = deal.getDealDate().toLocalDate();
            long[] counts = daily.computeIfAbsent(day, d -> new long[] {0L, 0L});
            if ("closed won".equals(stageName)) {
                counts[0] += 1;
            } else {
                counts[1] += 1;
            }
        }

        List<DealOutcomeTrendPointDto> points = daily.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new DealOutcomeTrendPointDto(
                        e.getKey().toString(), e.getValue()[0], e.getValue()[1]))
                .toList();
        return new DealOutcomeTrendResponse(points);
    }

    private OptionalDateRange resolvePeriod(String period) {
        ZoneOffset z = ZoneOffset.UTC;
        LocalDate today = LocalDate.now(z);
        LocalDateTime now = LocalDateTime.now(z);
        return switch (period) {
            case "ALL" -> new OptionalDateRange(LocalDate.MIN.atStartOfDay(), LocalDate.MAX.atStartOfDay());
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
        boolean includes(LocalDateTime value) {
            return (value.isEqual(startInclusive) || value.isAfter(startInclusive)) && value.isBefore(endExclusive);
        }
    }
}
