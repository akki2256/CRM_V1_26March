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

    public MailNotificationService(JavaMailSender mailSender, AppProperties appProperties) {
        this.mailSender = mailSender;
        this.appProperties = appProperties;
    }

    public void sendTemporaryPassword(String toEmail, String username, String plainTemporaryPassword) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(appProperties.getMail().getFrom());
        message.setTo(toEmail);
        message.setSubject("Your temporary CRM password");
        message.setText(
                "Hello,\n\n"
                        + "You requested a password reset for user ID (login name): "
                        + username
                        + "\n\nYour temporary password is: "
                        + plainTemporaryPassword
                        + "\n\nThis temporary password is valid for 10 minutes. After you sign in, you will be "
                        + "asked to choose a new password that meets the password policy.\n\n"
                        + "If you did not request this, please contact your administrator.\n");
        sendOrLog(message);
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
