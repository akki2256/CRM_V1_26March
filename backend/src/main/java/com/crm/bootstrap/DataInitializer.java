package com.crm.bootstrap;

import com.crm.domain.AppUser;
import com.crm.domain.CrmGroup;
import com.crm.domain.UserGroup;
import com.crm.domain.UserGroupId;
import com.crm.domain.UserStatus;
import com.crm.repo.AppUserRepository;
import com.crm.repo.CrmGroupRepository;
import com.crm.repo.UserGroupRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    private static final String SYSTEM = "SYSTEM";

    @Bean
    CommandLineRunner seedGroupsAndDemoAdmin(
            CrmGroupRepository groupRepository,
            AppUserRepository userRepository,
            UserGroupRepository userGroupRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            List<String> names = List.of("Admin", "Agent", "Lead", "Manager");
            for (String name : names) {
                if (groupRepository.findByGroupNameIgnoreCase(name).isEmpty()) {
                    CrmGroup g = new CrmGroup();
                    g.setGroupName(name);
                    g.setCreatedBy(SYSTEM);
                    g.setCreatedDate(LocalDateTime.now(ZoneOffset.UTC));
                    g.setLastUpdatedBy(SYSTEM);
                    g.setLastUpdatedDate(LocalDateTime.now(ZoneOffset.UTC));
                    g.setOcaControl(0L);
                    groupRepository.save(g);
                }
            }

            if (userRepository.findByUsernameIgnoreCase("admin").isEmpty()) {
                AppUser admin = new AppUser();
                admin.setUsername("admin");
                admin.setFirstName("System");
                admin.setLastName("Administrator");
                admin.setPasswordHash(passwordEncoder.encode("ChangeMe!1"));
                admin.setEmail("admin@example.com");
                admin.setPhoneNumber(null);
                admin.setLoginAttempts(0);
                admin.setUserStatus(UserStatus.ACTIVE);
                admin.setMustChangePassword(false);
                admin.setCreatedBy(SYSTEM);
                admin.setCreatedDate(LocalDateTime.now(ZoneOffset.UTC));
                admin.setLastUpdatedBy(SYSTEM);
                admin.setLastUpdatedDate(LocalDateTime.now(ZoneOffset.UTC));
                admin.setOcaControl(0L);
                userRepository.save(admin);

                CrmGroup adminGroup = groupRepository
                        .findByGroupNameIgnoreCase("Admin")
                        .orElseThrow();
                UserGroup link = new UserGroup();
                UserGroupId id = new UserGroupId(admin.getUserId(), adminGroup.getGroupId());
                link.setId(id);
                link.setUser(admin);
                link.setGroup(adminGroup);
                link.setCreatedBy(SYSTEM);
                link.setCreatedDate(LocalDateTime.now(ZoneOffset.UTC));
                link.setLastUpdatedBy(SYSTEM);
                link.setLastUpdatedDate(LocalDateTime.now(ZoneOffset.UTC));
                link.setOcaControl(0L);
                userGroupRepository.save(link);
            }
        };
    }
}
