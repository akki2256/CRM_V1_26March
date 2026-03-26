package com.crm.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.util.AntPathMatcher;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class PasswordChangeEnforcementFilter extends OncePerRequestFilter {

    private static final AntPathMatcher MATCHER = new AntPathMatcher();
    private static final Set<String> ALLOWED_WHEN_RESET_REQUIRED = Set.of(
            "/api/auth/change-password-after-reset",
            "/api/auth/me",
            "/api/auth/logout");

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        String path = request.getServletPath();
        if (path.isEmpty()) {
            path = request.getRequestURI();
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof JwtUserPrincipal p && p.isRequiresPasswordChange()) {
            if (!isAllowed(path, request.getMethod())) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"code\":\"PASSWORD_CHANGE_REQUIRED\"}");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private boolean isAllowed(String path, String method) {
        if (!"GET".equalsIgnoreCase(method) && !"POST".equalsIgnoreCase(method)) {
            return false;
        }
        return ALLOWED_WHEN_RESET_REQUIRED.stream().anyMatch(p -> MATCHER.match(p, path));
    }
}
