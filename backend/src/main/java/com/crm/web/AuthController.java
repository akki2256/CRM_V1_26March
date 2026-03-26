package com.crm.web;

import com.crm.service.AuthService;
import com.crm.web.dto.EmailRequest;
import com.crm.web.dto.ForgotPasswordResponse;
import com.crm.web.dto.LoginRequest;
import com.crm.web.dto.LoginResponse;
import com.crm.web.dto.MeResponse;
import com.crm.web.dto.NewPasswordRequest;
import com.crm.web.dto.TokenResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String GENERIC_FORGOT_MSG =
            "If an account exists for that email, instructions have been sent.";

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public MeResponse me(Authentication authentication) {
        return authService.me(authentication);
    }

    @PostMapping("/forgot-password")
    public ForgotPasswordResponse forgotPassword(@Valid @RequestBody EmailRequest request) {
        authService.forgotPassword(request.email());
        return new ForgotPasswordResponse(GENERIC_FORGOT_MSG);
    }

    @PostMapping("/forgot-userid")
    public ForgotPasswordResponse forgotUserId(@Valid @RequestBody EmailRequest request) {
        authService.forgotUserId(request.email());
        return new ForgotPasswordResponse(GENERIC_FORGOT_MSG);
    }

    @PostMapping("/change-password-after-reset")
    public TokenResponse changePasswordAfterReset(
            @Valid @RequestBody NewPasswordRequest request, Authentication authentication) {
        return authService.changePasswordAfterReset(request, authentication);
    }
}
