package com.crm.service;

import com.crm.domain.AppUser;
import com.crm.domain.Alignment;
import com.crm.domain.CrmGroup;
import com.crm.domain.UserAlignment;
import com.crm.domain.UserAlignmentId;
import com.crm.domain.UserGroup;
import com.crm.domain.UserGroupId;
import com.crm.domain.UserStatus;
import com.crm.repo.AlignmentRepository;
import com.crm.repo.AppUserRepository;
import com.crm.repo.CrmGroupRepository;
import com.crm.repo.UserAlignmentRepository;
import com.crm.repo.UserGroupRepository;
import com.crm.security.JwtUserPrincipal;
import com.crm.web.dto.AlignmentCreateRequest;
import com.crm.web.dto.AlignmentOptionResponse;
import com.crm.web.ApiException;
import com.crm.web.dto.GroupOptionResponse;
import com.crm.web.dto.UserCreateRequest;
import com.crm.web.dto.UserAlignmentPatchRequest;
import com.crm.web.dto.UserCreateResponse;
import com.crm.web.dto.UserMaintenanceRowResponse;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserMaintenanceService {

    private final UserGroupRepository userGroupRepository;
    private final UserAlignmentRepository userAlignmentRepository;
    private final AlignmentRepository alignmentRepository;
    private final CrmGroupRepository crmGroupRepository;
    private final AppUserRepository appUserRepository;
    private final UserDirectoryService userDirectoryService;
    private final PasswordPolicyService passwordPolicyService;
    private final PasswordEncoder passwordEncoder;

    public UserMaintenanceService(
            UserGroupRepository userGroupRepository,
            UserAlignmentRepository userAlignmentRepository,
            AlignmentRepository alignmentRepository,
            CrmGroupRepository crmGroupRepository,
            AppUserRepository appUserRepository,
            UserDirectoryService userDirectoryService,
            PasswordPolicyService passwordPolicyService,
            PasswordEncoder passwordEncoder) {
        this.userGroupRepository = userGroupRepository;
        this.userAlignmentRepository = userAlignmentRepository;
        this.alignmentRepository = alignmentRepository;
        this.crmGroupRepository = crmGroupRepository;
        this.appUserRepository = appUserRepository;
        this.userDirectoryService = userDirectoryService;
        this.passwordPolicyService = passwordPolicyService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserMaintenanceRowResponse> searchUsers(
            Authentication authentication,
            String firstName,
            String firstNameOp,
            String lastName,
            String lastNameOp,
            String username,
            String usernameOp,
            String email,
            String emailOp,
            String phone,
            String phoneOp,
            String userGroup) {
        ensureAdminOrManager(authentication);

        List<UserGroup> allLinks = userGroupRepository.findAllWithUserAndGroup();
        Map<Long, UserRowBuilder> byUserId = new HashMap<>();
        for (UserGroup link : allLinks) {
            AppUser user = link.getUser();
            UserRowBuilder builder = byUserId.computeIfAbsent(user.getUserId(), k -> new UserRowBuilder(user));
            builder.groups.add(link.getGroup().getGroupName());
        }
        List<UserAlignment> userAlignments = userAlignmentRepository.findAllWithUserAndAlignment();
        for (UserAlignment link : userAlignments) {
            UserRowBuilder builder = byUserId.get(link.getUser().getUserId());
            if (builder != null) {
                builder.alignments.add(link.getAlignment().getAlignmentName());
                if (builder.selectedAlignmentId == null) {
                    builder.selectedAlignmentId = link.getAlignment().getAlignmentId();
                }
            }
        }

        return byUserId.values().stream()
                .map(UserRowBuilder::toResponse)
                .filter(row -> matches(row.firstName(), firstName, firstNameOp))
                .filter(row -> matches(row.lastName(), lastName, lastNameOp))
                .filter(row -> matches(row.username(), username, usernameOp))
                .filter(row -> matches(row.email(), email, emailOp))
                .filter(row -> matches(row.phoneNumber(), phone, phoneOp))
                .filter(row -> matchesGroup(row.userGroups(), userGroup))
                .sorted(Comparator.comparing(UserMaintenanceRowResponse::username, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GroupOptionResponse> listGroups(Authentication authentication) {
        ensureAdminOrManager(authentication);
        return crmGroupRepository.findAllByOrderByGroupNameAsc().stream()
                .map(g -> new GroupOptionResponse(g.getGroupId(), g.getGroupName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AlignmentOptionResponse> listAlignments(Authentication authentication) {
        ensureAdminOrManager(authentication);
        return alignmentRepository.findAllByOrderByAlignmentNameAsc().stream()
                .map(a -> new AlignmentOptionResponse(a.getAlignmentId(), a.getAlignmentName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public UserMaintenanceRowResponse userById(Authentication authentication, Long userId) {
        ensureAdminOrManager(authentication);
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));
        List<String> groups = userDirectoryService.groupNamesForUser(userId);
        List<UserAlignment> alignments = userAlignmentRepository.findAllWithAlignmentByUserId(userId);
        List<String> alignmentNames = alignments.stream()
                .map(a -> a.getAlignment().getAlignmentName())
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        Long selectedAlignmentId = alignments.isEmpty() ? null : alignments.get(0).getAlignment().getAlignmentId();
        return new UserMaintenanceRowResponse(
                user.getUserId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                groups,
                alignmentNames,
                selectedAlignmentId,
                user.getEmail(),
                user.getPhoneNumber());
    }

    @Transactional
    public UserCreateResponse createUser(Authentication authentication, UserCreateRequest request) {
        String actor = ensureAdminOrManager(authentication);
        passwordPolicyService.validate(request.password());

        if (appUserRepository.findByUsernameIgnoreCase(request.username().trim()).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Username already exists.");
        }
        if (appUserRepository.findByEmailIgnoreCase(request.email().trim()).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already exists.");
        }

        CrmGroup primaryGroup = crmGroupRepository.findByGroupNameIgnoreCase(request.userGroup().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "User Group not found."));

        CrmGroup additionalGroup = null;
        if (request.addToGroup() != null && !request.addToGroup().isBlank()) {
            additionalGroup = crmGroupRepository.findByGroupNameIgnoreCase(request.addToGroup().trim())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Add to group value is invalid."));
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        AppUser user = new AppUser();
        user.setUsername(request.username().trim());
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        user.setPhoneNumber(request.phoneNumber().trim());
        user.setLoginAttempts(0);
        user.setUserStatus(UserStatus.ACTIVE);
        user.setMustChangePassword(false);
        user.setCreatedBy(actor);
        user.setCreatedDate(now);
        user.setLastUpdatedBy(actor);
        user.setLastUpdatedDate(now);
        user.setOcaControl(0L);

        appUserRepository.save(user);
        saveMembership(user, primaryGroup, actor, now);
        if (additionalGroup != null && !additionalGroup.getGroupId().equals(primaryGroup.getGroupId())) {
            saveMembership(user, additionalGroup, actor, now);
        }

        return new UserCreateResponse(user.getUserId(), "User created successfully.");
    }

    @Transactional
    public AlignmentOptionResponse createAlignment(Authentication authentication, AlignmentCreateRequest request) {
        String actor = ensureAdminOrManager(authentication);
        String name = request.alignmentName().trim();
        if (alignmentRepository.findByAlignmentNameIgnoreCase(name).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Alignment already exists.");
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        Alignment alignment = new Alignment();
        alignment.setAlignmentName(name);
        alignment.setCreatedBy(actor);
        alignment.setCreatedDate(now);
        alignment.setLastUpdatedBy(actor);
        alignment.setLastUpdatedDate(now);
        alignment.setOcaControl(0L);
        alignmentRepository.save(alignment);
        return new AlignmentOptionResponse(alignment.getAlignmentId(), alignment.getAlignmentName());
    }

    @Transactional
    public void patchUserAlignment(Authentication authentication, Long userId, UserAlignmentPatchRequest request) {
        String actor = ensureAdminOrManager(authentication);
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));
        Alignment alignment = alignmentRepository.findById(request.alignmentId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Alignment not found."));
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        userAlignmentRepository.deleteByUserUserId(userId);
        UserAlignment link = new UserAlignment();
        link.setId(new UserAlignmentId(userId, alignment.getAlignmentId()));
        link.setUser(user);
        link.setAlignment(alignment);
        link.setCreatedBy(actor);
        link.setCreatedDate(now);
        link.setLastUpdatedBy(actor);
        link.setLastUpdatedDate(now);
        link.setOcaControl(0L);
        userAlignmentRepository.save(link);
    }

    private void saveMembership(AppUser user, CrmGroup group, String actor, LocalDateTime now) {
        UserGroup link = new UserGroup();
        link.setId(new UserGroupId(user.getUserId(), group.getGroupId()));
        link.setUser(user);
        link.setGroup(group);
        link.setCreatedBy(actor);
        link.setCreatedDate(now);
        link.setLastUpdatedBy(actor);
        link.setLastUpdatedDate(now);
        link.setOcaControl(0L);
        userGroupRepository.save(link);
    }

    private boolean matches(String actual, String filterValue, String filterOp) {
        if (filterValue == null || filterValue.isBlank()) {
            return true;
        }
        String op = normalizeOp(filterOp);
        String left = actual == null ? "" : actual.toLowerCase(Locale.ROOT);
        String right = filterValue.trim().toLowerCase(Locale.ROOT);
        return switch (op) {
            case "eq" -> left.equals(right);
            case "starts" -> left.startsWith(right);
            case "ends" -> left.endsWith(right);
            case "neq" -> !left.equals(right);
            default -> left.equals(right);
        };
    }

    private boolean matchesGroup(List<String> groups, String groupFilter) {
        if (groupFilter == null || groupFilter.isBlank()) {
            return true;
        }
        String lookup = groupFilter.trim().toLowerCase(Locale.ROOT);
        return groups.stream().anyMatch(g -> g.toLowerCase(Locale.ROOT).equals(lookup));
    }

    private String normalizeOp(String op) {
        if (op == null || op.isBlank()) {
            return "eq";
        }
        return switch (op.trim().toLowerCase(Locale.ROOT)) {
            case "equal", "equals", "eq", "equal_to" -> "eq";
            case "starts", "starts_with", "startswith" -> "starts";
            case "ends", "ends_with", "endswith" -> "ends";
            case "not_equals", "not_equal", "neq", "not_eq" -> "neq";
            default -> "eq";
        };
    }

    private String ensureAdminOrManager(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtUserPrincipal principal)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin/Manager access required.");
        }
        List<String> groups = userDirectoryService.groupNamesForUser(principal.getUserId());
        boolean privileged = groups.stream()
                .anyMatch(g -> "ADMIN".equalsIgnoreCase(g) || "MANAGER".equalsIgnoreCase(g));
        if (!privileged) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin/Manager access required.");
        }
        return principal.getUsername();
    }

    private static class UserRowBuilder {
        private final AppUser user;
        private final Set<String> groups = new HashSet<>();
        private final Set<String> alignments = new HashSet<>();
        private Long selectedAlignmentId;

        private UserRowBuilder(AppUser user) {
            this.user = user;
        }

        private UserMaintenanceRowResponse toResponse() {
            List<String> sortedGroups = new ArrayList<>(groups);
            sortedGroups.sort(String.CASE_INSENSITIVE_ORDER);
            return new UserMaintenanceRowResponse(
                    user.getUserId(),
                    user.getUsername(),
                    user.getFirstName(),
                    user.getLastName(),
                    sortedGroups,
                    sortedAlignments(),
                    selectedAlignmentId,
                    user.getEmail(),
                    user.getPhoneNumber());
        }

        private List<String> sortedAlignments() {
            List<String> sorted = new ArrayList<>(alignments);
            sorted.sort(String.CASE_INSENSITIVE_ORDER);
            return sorted;
        }
    }
}
