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

    private static final String WELCOME_ATTEMPTS_EXHAUSTED_MESSAGE =
            "You have used all allowed attempts with your welcome password. Please use Forgot password to set a new password.";

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties appProperties;
    private final PasswordPolicyService passwordPolicyService;
    private final MailNotificationService mailNotificationService;
    private final UserDirectoryService userDirectoryService;

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

    @Transactional(noRollbackFor = ApiException.class)
    public LoginResponse login(LoginRequest request) {
        Optional<AppUser> opt = userRepository.findByUsernameIgnoreCase(request.username().trim());
        if (opt.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid user ID or password.");
        }
        AppUser user = opt.get();
        if (user.getUserStatus() == UserStatus.INACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is not active.");
        }
        if (user.getUserStatus() == UserStatus.LOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is locked. Contact an administrator.");
        }
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is not active.");
        }

        int welcomeMax = appProperties.getSecurity().getWelcomePasswordMaxAttempts();
        if (user.isMustChangePassword() && user.getWelcomePasswordAttempts() >= welcomeMax) {
            throw new ApiException(HttpStatus.FORBIDDEN, WELCOME_ATTEMPTS_EXHAUSTED_MESSAGE);
        }

        String raw = request.password();
        boolean regularMatch = passwordEncoder.matches(raw, user.getPasswordHash());
        boolean tempMatch = isTemporaryPasswordValid(user, raw);

        if (!regularMatch && !tempMatch) {
            if (user.isMustChangePassword()) {
                throw welcomePasswordFailedException(user, welcomeMax);
            }
            if (hasActiveTemporaryPassword(user)) {
                throw welcomePasswordFailedException(user, welcomeMax);
            }
            registerFailedAttempt(user);
            throw failedLoginException(user);
        }

        if (tempMatch) {
            user.setMustChangePassword(true);
            user.setTemporaryPasswordHash(null);
            user.setTemporaryPasswordExpiresAt(null);
            user.setWelcomePasswordAttempts(0);
        }

        boolean requiresChange = user.isMustChangePassword();
        user.setLoginAttempts(0);
        user.setWelcomePasswordAttempts(0);
        if (user.getUserStatus() == UserStatus.LOCKED) {
            user.setUserStatus(UserStatus.ACTIVE);
        }
        touchUser(user, user.getUsername());
        userRepository.save(user);

        String token = jwtService.generateToken(user, requiresChange);
        return new LoginResponse(token, requiresChange);
    }

    @Transactional
    public void forgotPassword(String emailOrUsername) {
        AppUser user = resolveUserForPasswordRecovery(emailOrUsername);
        if (user.getUserStatus() == UserStatus.INACTIVE) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "This account is not active. Password reset is not available for removed users.");
        }
        if (user.getUserStatus() == UserStatus.LOCKED) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Account is locked. Contact an administrator before resetting your password.");
        }
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN, "Password reset is only available for active accounts.");
        }

        String plain = passwordPolicyService.generateCompliantPassword();
        user.setTemporaryPasswordHash(passwordEncoder.encode(plain));
        user.setTemporaryPasswordExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plus(10, ChronoUnit.MINUTES));
        user.setWelcomePasswordAttempts(0);
        user.setMustChangePassword(true);
        user.setLoginAttempts(0);
        touchUser(user, SYSTEM);
        userRepository.save(user);
        mailNotificationService.sendTemporaryPassword(
                user.getEmail(), user.getFirstName(), user.getUsername(), plain);
    }

    private AppUser resolveUserForPasswordRecovery(String emailOrUsername) {
        String key = emailOrUsername == null ? "" : emailOrUsername.trim();
        if (key.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email or user ID is required.");
        }
        Optional<AppUser> user;
        if (key.contains("@")) {
            user = userRepository.findByEmailIgnoreCase(key);
        } else {
            user = userRepository.findByUsernameIgnoreCase(key);
        }
        return user.orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "No account found for that email or user ID."));
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
        user.setWelcomePasswordAttempts(0);
        user.setTemporaryPasswordHash(null);
        user.setTemporaryPasswordExpiresAt(null);
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

    private boolean hasActiveTemporaryPassword(AppUser user) {
        if (user.getTemporaryPasswordHash() == null || user.getTemporaryPasswordExpiresAt() == null) {
            return false;
        }
        return !user.getTemporaryPasswordExpiresAt().isBefore(LocalDateTime.now(ZoneOffset.UTC));
    }

    private boolean isTemporaryPasswordValid(AppUser user, String rawPassword) {
        if (!hasActiveTemporaryPassword(user)) {
            return false;
        }
        return passwordEncoder.matches(rawPassword, user.getTemporaryPasswordHash());
    }

    private ApiException welcomePasswordFailedException(AppUser user, int welcomeMax) {
        int nextWelcome = user.getWelcomePasswordAttempts() + 1;
        user.setWelcomePasswordAttempts(nextWelcome);
        persistSecurityCounters(user);
        if (nextWelcome >= welcomeMax) {
            return new ApiException(HttpStatus.FORBIDDEN, WELCOME_ATTEMPTS_EXHAUSTED_MESSAGE);
        }
        int remaining = welcomeMax - nextWelcome;
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "Invalid user ID or password. "
                        + remaining
                        + " welcome password attempt(s) remaining.");
    }

    private void registerFailedAttempt(AppUser user) {
        int next = user.getLoginAttempts() + 1;
        user.setLoginAttempts(next);
        if (next >= appProperties.getSecurity().getMaxLoginAttempts()) {
            user.setUserStatus(UserStatus.LOCKED);
        }
        persistSecurityCounters(user);
    }

    /** Persists login/welcome counters without bumping optimistic concurrency (oca_control). */
    private void persistSecurityCounters(AppUser user) {
        user.setLastUpdatedBy(SYSTEM);
        user.setLastUpdatedDate(LocalDateTime.now(ZoneOffset.UTC));
        userRepository.save(user);
    }

    private ApiException failedLoginException(AppUser user) {
        if (user.getUserStatus() == UserStatus.LOCKED) {
            return new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Account is locked after too many failed login attempts. Contact an administrator.");
        }
        int max = appProperties.getSecurity().getMaxLoginAttempts();
        int remaining = Math.max(0, max - user.getLoginAttempts());
        if (remaining > 0 && remaining <= max) {
            return new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid user ID or password. " + remaining + " attempt(s) remaining before the account is locked.");
        }
        return new ApiException(HttpStatus.UNAUTHORIZED, "Invalid user ID or password.");
    }

    private void touchUser(AppUser user, String actor) {
        user.setLastUpdatedBy(actor);
        user.setLastUpdatedDate(LocalDateTime.now(ZoneOffset.UTC));
        user.setOcaControl(user.getOcaControl() + 1);
    }

}
