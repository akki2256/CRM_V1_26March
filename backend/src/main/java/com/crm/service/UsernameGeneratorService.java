package com.crm.service;

import com.crm.repo.AppUserRepository;
import com.crm.web.ApiException;
import java.security.SecureRandom;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class UsernameGeneratorService {

    private static final int MAX_ATTEMPTS = 50;

    private final AppUserRepository appUserRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public UsernameGeneratorService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    /**
     * Builds the alphabetic prefix: up to the first two letters from the first name (letters only, lowercased).
     */
    public String prefixFromFirstName(String firstName) {
        if (firstName == null) {
            return "";
        }
        StringBuilder letters = new StringBuilder();
        for (int i = 0; i < firstName.length() && letters.length() < 2; i++) {
            char ch = firstName.charAt(i);
            if (Character.isLetter(ch)) {
                letters.append(Character.toLowerCase(ch));
            }
        }
        return letters.toString();
    }

    public String generateUniqueUsername(String firstName) {
        String prefix = prefixFromFirstName(firstName);
        if (prefix.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "First name must contain at least one letter.");
        }
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            int suffix = secureRandom.nextInt(10_000);
            String candidate = prefix + String.format(Locale.ROOT, "%04d", suffix);
            if (appUserRepository.findByUsernameIgnoreCase(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new ApiException(
                HttpStatus.CONFLICT,
                "Could not generate a unique username. Please try again or contact support.");
    }
}
