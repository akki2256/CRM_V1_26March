package com.crm.tools;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Prints BCrypt values for manual DB updates. Uses the same encoder as the CRM app
 * ({@link BCryptPasswordEncoder} default strength 10).
 * <p>
 * Run from {@code backend}:
 * <pre>
 *   .\mvnw.cmd -q compile exec:java "-Dexec.args=YourPasswordHere"
 * </pre>
 * On Unix, use single quotes around the password if it contains shell-special characters.
 * <p>
 * {@code password_hash} — store the printed BCrypt string in {@code users.password_hash}.<br>
 * {@code password_salt} — this application verifies only {@code password_hash}; use an empty string in DB.
 * The optional random Base64 line is only if you want {@code password_salt} populated for non-auth reasons.
 */
public final class PasswordHashGenerator {

    private PasswordHashGenerator() {}

    public static void main(String[] args) {
        if (args.length < 1 || args[0].isBlank()) {
            System.err.println("Usage: PasswordHashGenerator <plain-password>");
            System.err.println("  (password must be non-empty)");
            System.exit(1);
            return;
        }
        String plain = args[0];
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode(plain);

        byte[] extraSalt = new byte[16];
        new SecureRandom().nextBytes(extraSalt);
        String optionalColumnSalt = Base64.getEncoder().encodeToString(extraSalt);

        System.out.println("-- For table \"users\":");
        System.out.println("password_hash = " + hash);
        System.out.println("password_salt =   (empty string — app login uses BCrypt hash only)");
        System.out.println("optional separate salt (not used by AuthService; schema placeholder only) = " + optionalColumnSalt);
        System.out.println("self-check matches: " + encoder.matches(plain, hash));
    }
}
