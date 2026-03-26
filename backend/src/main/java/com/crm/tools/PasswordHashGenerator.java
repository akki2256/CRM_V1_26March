package com.crm.tools;

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
 * {@code password_hash} — store the printed BCrypt string in {@code users.password_hash}.
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

        System.out.println("-- For table \"users\":");
        System.out.println("password_hash = " + hash);
        System.out.println("self-check matches: " + encoder.matches(plain, hash));
    }
}
