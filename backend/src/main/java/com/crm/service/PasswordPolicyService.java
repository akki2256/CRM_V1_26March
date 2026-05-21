package com.crm.service;

import com.crm.web.ApiException;
import java.security.SecureRandom;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class PasswordPolicyService {

    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghjkmnpqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SPECIAL = "!@#$%&*";
    private static final String ALL = UPPER + LOWER + DIGITS + SPECIAL;

    private final SecureRandom secureRandom = new SecureRandom();

    public String generateCompliantPassword() {
        StringBuilder password = new StringBuilder(12);
        password.append(randomChar(UPPER));
        password.append(randomChar(LOWER));
        password.append(randomChar(DIGITS));
        password.append(randomChar(SPECIAL));
        for (int i = 0; i < 8; i++) {
            password.append(randomChar(ALL));
        }
        char[] chars = password.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = secureRandom.nextInt(i + 1);
            char tmp = chars[i];
            chars[i] = chars[j];
            chars[j] = tmp;
        }
        return new String(chars);
    }

    public void validate(String password) {
        if (password == null || password.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters.");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must contain an uppercase letter.");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must contain a lowercase letter.");
        }
        if (!password.matches(".*[0-9].*")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must contain a digit.");
        }
        if (!password.matches(".*[^A-Za-z0-9].*")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must contain a special character.");
        }
    }

    private char randomChar(String alphabet) {
        return alphabet.charAt(secureRandom.nextInt(alphabet.length()));
    }
}
