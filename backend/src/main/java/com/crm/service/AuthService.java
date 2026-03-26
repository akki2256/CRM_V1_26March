package com.crm.service;

import com.crm.config.AppProperties;
import com.crm.domain.AppUser;
import com.crm.domain.UserStatus;
import com.crm.repo.AppUserRepository;
import com.crm.security.JwtService;
import com.crm.security.JwtUserPrincipal;
import com.crm.web.ApiException;
import com.crm.web.dto.LoginRequest;
import com.crm.web.dto.LoginResponse;
import com.crm.web.dto.MeResponse;
import com.crm.web.dto.NewPasswordRequest;
import com.crm.web.dto.TokenResponse;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String SYSTEM = "SYSTEM";

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties appProperties;
    private final PasswordPolicyService passwordPolicyService;
    private final MailNotificationService mailNotificationService;
    private final UserDirectoryService userDirectoryService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AppProperties appProperties,
            PasswordPolicyService passwordPolicyService,
            MailNotificationService mailNotificationService,
            UserDirectoryService userDirectoryService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.appProperties = appProperties;
        this.passwordPolicyService = passwordPolicyService;
        this.mailNotificationService = mailNotificationService;
        this.userDirectoryService = userDirectoryService;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Optional<AppUser> opt = userRepository.findByUsernameIgnoreCase(request.username().trim());
        if (opt.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid user ID or password.");
        }
        AppUser user = opt.get();
        if (user.getUserStatus() == UserStatus.LOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is locked. Contact an administrator.");
        }
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is not active.");
        }

        String raw = request.password();
        boolean regularMatch = passwordEncoder.matches(raw, user.getPasswordHash());
        boolean tempMatch = isTemporaryPasswordValid(user, raw);

        if (!regularMatch && !tempMatch) {
            registerFailedAttempt(user);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid user ID or password.");
        }

        if (tempMatch) {
            user.setMustChangePassword(true);
            user.setTemporaryPasswordHash(null);
            user.setTemporaryPasswordExpiresAt(null);
        }

        boolean requiresChange = user.isMustChangePassword();
        user.setLoginAttempts(0);
        touchUser(user, user.getUsername());
        userRepository.save(user);

        String token = jwtService.generateToken(user, requiresChange);
        return new LoginResponse(token, requiresChange);
    }

    @Transactional
    public void forgotPassword(String email) {
        AppUser user = userRepository
                .findByEmailIgnoreCase(email.trim())
                .orElse(null);
        if (user == null) {
            return;
        }
        String plain = randomTempPassword();
        user.setTemporaryPasswordHash(passwordEncoder.encode(plain));
        user.setTemporaryPasswordExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plus(10, ChronoUnit.MINUTES));
        touchUser(user, SYSTEM);
        userRepository.save(user);
        mailNotificationService.sendTemporaryPassword(user.getEmail(), user.getUsername(), plain);
    }

    @Transactional(readOnly = true)
    public void forgotUserId(String email) {
        AppUser user = userRepository.findByEmailIgnoreCase(email.trim()).orElse(null);
        if (user == null) {
            return;
        }
        mailNotificationService.sendForgotUserId(user.getEmail(), user.getUsername());
    }

    @Transactional
    public TokenResponse changePasswordAfterReset(NewPasswordRequest request, Authentication authentication) {
        JwtUserPrincipal principal = (JwtUserPrincipal) authentication.getPrincipal();
        AppUser user = userRepository
                .findById(principal.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
        if (!user.isMustChangePassword()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password change is not required for this account.");
        }
        passwordPolicyService.validate(request.newPassword());
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        touchUser(user, user.getUsername());
        userRepository.save(user);
        String token = jwtService.generateToken(user, false);
        return new TokenResponse(token, false);
    }

    @Transactional(readOnly = true)
    public MeResponse me(Authentication authentication) {
        JwtUserPrincipal principal = (JwtUserPrincipal) authentication.getPrincipal();
        AppUser user = userRepository
                .findById(principal.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
        List<String> groups = userDirectoryService.groupNamesForUser(user.getUserId());
        return new MeResponse(
                user.getUserId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                groups,
                user.isMustChangePassword());
    }

    private boolean isTemporaryPasswordValid(AppUser user, String rawPassword) {
        if (user.getTemporaryPasswordHash() == null || user.getTemporaryPasswordExpiresAt() == null) {
            return false;
        }
        if (user.getTemporaryPasswordExpiresAt().isBefore(LocalDateTime.now(ZoneOffset.UTC))) {
            return false;
        }
        return passwordEncoder.matches(rawPassword, user.getTemporaryPasswordHash());
    }

    private void registerFailedAttempt(AppUser user) {
        int next = user.getLoginAttempts() + 1;
        user.setLoginAttempts(next);
        if (next >= appProperties.getSecurity().getMaxLoginAttempts()) {
            user.setUserStatus(UserStatus.LOCKED);
        }
        touchUser(user, SYSTEM);
        userRepository.save(user);
    }

    private void touchUser(AppUser user, String actor) {
        user.setLastUpdatedBy(actor);
        user.setLastUpdatedDate(LocalDateTime.now(ZoneOffset.UTC));
        user.setOcaControl(user.getOcaControl() + 1);
    }

    private String randomTempPassword() {
        byte[] buf = new byte[12];
        secureRandom.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }
}
