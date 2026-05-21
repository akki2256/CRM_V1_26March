package com.crm.service;

import com.crm.config.AppProperties;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class ResendEmailClient {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailClient.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    private final AppProperties appProperties;
    private final RestClient restClient;

    public ResendEmailClient(AppProperties appProperties) {
        this.appProperties = appProperties;
        this.restClient = RestClient.builder().build();
    }

    public boolean isConfigured() {
        String apiKey = appProperties.getResend().getApiKey();
        return apiKey != null && !apiKey.isBlank();
    }

    public void sendTextEmail(String toEmail, String subject, String textBody) {
        String apiKey = appProperties.getResend().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Resend API key is not configured (set RESEND_API_KEY).");
        }
        String from = appProperties.getResend().getFrom();
        if (from == null || from.isBlank()) {
            throw new IllegalStateException("Resend from address is not configured (set RESEND_FROM).");
        }

        ResendSendRequest payload =
                new ResendSendRequest(from, List.of(toEmail.trim()), subject, textBody);

        restClient
                .post()
                .uri(RESEND_API_URL)
                .header("Authorization", "Bearer " + apiKey.trim())
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    String body = new String(response.getBody().readAllBytes());
                    throw new IllegalStateException(
                            "Resend API error (" + response.getStatusCode().value() + "): " + body);
                })
                .toBodilessEntity();

        log.info("Resend email sent. subject={} to={}", subject, toEmail);
    }

    private record ResendSendRequest(String from, List<String> to, String subject, String text) {}
}
