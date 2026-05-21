package com.crm.service;

import com.crm.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.io.ByteArrayResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class MailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(MailNotificationService.class);

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;
    private final ResendEmailClient resendEmailClient;

    public MailNotificationService(
            JavaMailSender mailSender, AppProperties appProperties, ResendEmailClient resendEmailClient) {
        this.mailSender = mailSender;
        this.appProperties = appProperties;
        this.resendEmailClient = resendEmailClient;
    }

    public void sendTemporaryPassword(
            String userEmailOnFile, String firstName, String username, String plainTemporaryPassword) {
        String recipient = resolveCredentialEmailRecipient(userEmailOnFile);
        String displayFirstName =
                (firstName == null || firstName.isBlank()) ? "there" : firstName.trim();
        String subject = "Calicap CRM – temporary password";
        String text =
                "Hi "
                        + displayFirstName
                        + ",\n\n"
                        + "You requested a password reset for your CRM account.\n"
                        + "Use the temporary password below to sign in. It is valid for 10 minutes.\n"
                        + "After you sign in, you must choose a new password.\n\n"
                        + "Username: "
                        + username
                        + "\n"
                        + "Temporary password: "
                        + plainTemporaryPassword
                        + "\n\n"
                        + "Thanks,\n"
                        + "Calicap Admin\n";

        if (resendEmailClient.isConfigured()) {
            resendEmailClient.sendTextEmail(recipient, subject, text);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(appProperties.getMail().getFrom());
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(text);
        sendOrLog(message);
    }

    public void sendNewUserCredentials(
            String userEmailOnFile, String firstName, String username, String plainTemporaryPassword) {
        String recipient = resolveCredentialEmailRecipient(userEmailOnFile);
        String displayFirstName =
                (firstName == null || firstName.isBlank()) ? "there" : firstName.trim();
        String subject = "Welcome to Calicap – your CRM credentials";
        String text =
                "Hi "
                        + displayFirstName
                        + ",\n\n"
                        + "Welcome to Calicap. Below mentioned are your CRM username and password.\n"
                        + "Kindly do your first login and change your password.\n"
                        + "Username: "
                        + username
                        + "\n"
                        + "Password: "
                        + plainTemporaryPassword
                        + "\n\n"
                        + "Thanks,\n"
                        + "Calicap Admin\n";

        if (resendEmailClient.isConfigured()) {
            resendEmailClient.sendTextEmail(recipient, subject, text);
            return;
        }

        log.warn(
                "Resend is not configured (RESEND_API_KEY). New-user credentials email was not sent. "
                        + "to={} username={}",
                recipient,
                username);
        log.info("New-user credentials email body fallback:\n{}", text);
    }

    /** When {@code welcome-email-to} is set (local/testing), credential emails go there instead of the user inbox. */
    private String resolveCredentialEmailRecipient(String userEmailOnFile) {
        String override = appProperties.getResend().getWelcomeEmailTo();
        if (override != null && !override.isBlank()) {
            return override.trim();
        }
        return userEmailOnFile == null ? "" : userEmailOnFile.trim();
    }

    public void sendForgotUserId(String toEmail, String username) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(appProperties.getMail().getFrom());
        message.setTo(toEmail);
        message.setSubject("Your CRM user ID");
        message.setText(
                "Hello,\n\n"
                        + "You requested a reminder of your user ID for signing in to the CRM application.\n\n"
                        + "Your user ID (login name) is: "
                        + username
                        + "\n\nUse this user ID with your existing password to sign in.\n\n"
                        + "If you did not request this, please contact your administrator.\n");
        sendOrLog(message);
    }

    public void sendExportAttachment(String toEmail, String firstName, String fileName, String mimeType, byte[] bytes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            helper.setFrom(appProperties.getMail().getFrom());
            helper.setTo(toEmail);
            helper.setSubject("Your CRM export file");
            helper.setText(
                    "Hello " + (firstName == null || firstName.isBlank() ? "" : firstName) + ",\n\n"
                            + "Your requested CRM export is attached.\n\nRegards,\nCRM Team");
            helper.addAttachment(fileName, new ByteArrayResource(bytes), mimeType);
            mailSender.send(message);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Could not send export email. Please verify SMTP/mail configuration and try again.",
                    e);
        }
    }

    private void sendOrLog(SimpleMailMessage message) {
        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.warn(
                    "Could not send email (configure spring.mail or MAIL_* env). Subject={} To={} Error={}",
                    message.getSubject(),
                    message.getTo(),
                    e.getMessage());
            log.info("Email body fallback log: {}", message.getText());
        }
    }
}
