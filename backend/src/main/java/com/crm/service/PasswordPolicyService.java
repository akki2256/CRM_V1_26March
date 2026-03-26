package com.crm.service;

import com.crm.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class PasswordPolicyService {

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
}
