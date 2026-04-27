package com.crm.web;

import com.crm.service.ContactByLabelWidgetService;
import com.crm.service.DealOutcomeTrendWidgetService;
import com.crm.web.dto.ContactByLabelResponse;
import com.crm.web.dto.DealOutcomeTrendResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final ContactByLabelWidgetService contactByLabelWidgetService;
    private final DealOutcomeTrendWidgetService dealOutcomeTrendWidgetService;

    public DashboardController(
            ContactByLabelWidgetService contactByLabelWidgetService,
            DealOutcomeTrendWidgetService dealOutcomeTrendWidgetService) {
        this.contactByLabelWidgetService = contactByLabelWidgetService;
        this.dealOutcomeTrendWidgetService = dealOutcomeTrendWidgetService;
    }

    /** Buckets {@code CONTACT.label_code} into hot / warm / cold (case-insensitive) and others (not from {@code DEAL}). */
    @GetMapping("/contact-by-label")
    public ContactByLabelResponse contactByLabel(
            @RequestParam(name = "period", required = false, defaultValue = "LAST_MONTH") String period,
            Authentication authentication) {
        return contactByLabelWidgetService.aggregate(authentication, period);
    }

    @GetMapping("/deal-outcome-trend")
    public DealOutcomeTrendResponse dealOutcomeTrend(
            @RequestParam(name = "period", required = false, defaultValue = "LAST_MONTH") String period,
            Authentication authentication) {
        return dealOutcomeTrendWidgetService.aggregate(authentication, period);
    }
}
