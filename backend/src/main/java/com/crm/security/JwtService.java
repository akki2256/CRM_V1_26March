package com.crm.security;

import com.crm.config.AppProperties;
import com.crm.domain.AppUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String CLAIM_USER_ID = "uid";
    private static final String CLAIM_REQUIRES_PASSWORD_CHANGE = "rpc";

    private final AppProperties appProperties;

    public JwtService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public String generateToken(AppUser user, boolean requiresPasswordChange) {
        long now = System.currentTimeMillis();
        long exp = now + appProperties.getJwt().getExpirationMs();
        return Jwts.builder()
                .subject(user.getUsername())
                .issuedAt(new Date(now))
                .expiration(new Date(exp))
                .claims(Map.of(
                        CLAIM_USER_ID, user.getUserId(),
                        CLAIM_REQUIRES_PASSWORD_CHANGE, requiresPasswordChange))
                .signWith(signingKey())
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean requiresPasswordChange(Claims claims) {
        Boolean v = claims.get(CLAIM_REQUIRES_PASSWORD_CHANGE, Boolean.class);
        return Boolean.TRUE.equals(v);
    }

    public Long userId(Claims claims) {
        Object raw = claims.get(CLAIM_USER_ID);
        if (raw instanceof Number n) {
            return n.longValue();
        }
        return null;
    }

    private SecretKey signingKey() {
        byte[] keyBytes = appProperties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
