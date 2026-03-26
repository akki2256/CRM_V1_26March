package com.crm.security;

import java.io.Serializable;

public class JwtUserPrincipal implements Serializable {

    private final String username;
    private final Long userId;
    private final boolean requiresPasswordChange;

    public JwtUserPrincipal(String username, Long userId, boolean requiresPasswordChange) {
        this.username = username;
        this.userId = userId;
        this.requiresPasswordChange = requiresPasswordChange;
    }

    public String getUsername() {
        return username;
    }

    public Long getUserId() {
        return userId;
    }

    public boolean isRequiresPasswordChange() {
        return requiresPasswordChange;
    }
}
