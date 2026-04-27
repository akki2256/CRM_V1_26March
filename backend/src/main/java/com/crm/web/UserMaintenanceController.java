package com.crm.web;

import com.crm.service.UserMaintenanceService;
import com.crm.web.dto.AlignmentCreateRequest;
import com.crm.web.dto.AlignmentOptionResponse;
import com.crm.web.dto.GroupOptionResponse;
import com.crm.web.dto.UserCreateRequest;
import com.crm.web.dto.UserAlignmentPatchRequest;
import com.crm.web.dto.UserCreateResponse;
import com.crm.web.dto.UserMaintenanceRowResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/user-maintenance")
public class UserMaintenanceController {

    private final UserMaintenanceService userMaintenanceService;

    public UserMaintenanceController(UserMaintenanceService userMaintenanceService) {
        this.userMaintenanceService = userMaintenanceService;
    }

    @GetMapping("/users")
    public List<UserMaintenanceRowResponse> users(
            Authentication authentication,
            @RequestParam(required = false) String firstName,
            @RequestParam(required = false) String firstNameOp,
            @RequestParam(required = false) String lastName,
            @RequestParam(required = false) String lastNameOp,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String usernameOp,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String emailOp,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String phoneOp,
            @RequestParam(required = false) String userGroup) {
        return userMaintenanceService.searchUsers(
                authentication,
                firstName,
                firstNameOp,
                lastName,
                lastNameOp,
                username,
                usernameOp,
                email,
                emailOp,
                phone,
                phoneOp,
                userGroup);
    }

    @GetMapping("/users/{userId}")
    public UserMaintenanceRowResponse userById(Authentication authentication, @PathVariable Long userId) {
        return userMaintenanceService.userById(authentication, userId);
    }

    @PostMapping("/users")
    public UserCreateResponse createUser(Authentication authentication, @Valid @RequestBody UserCreateRequest request) {
        return userMaintenanceService.createUser(authentication, request);
    }

    @GetMapping("/groups")
    public List<GroupOptionResponse> groups(Authentication authentication) {
        return userMaintenanceService.listGroups(authentication);
    }

    @GetMapping("/alignments")
    public List<AlignmentOptionResponse> alignments(Authentication authentication) {
        return userMaintenanceService.listAlignments(authentication);
    }

    @PostMapping("/alignments")
    public AlignmentOptionResponse createAlignment(
            Authentication authentication,
            @Valid @RequestBody AlignmentCreateRequest request) {
        return userMaintenanceService.createAlignment(authentication, request);
    }

    @PatchMapping("/users/{userId}/alignment")
    public void patchAlignment(
            Authentication authentication,
            @PathVariable Long userId,
            @Valid @RequestBody UserAlignmentPatchRequest request) {
        userMaintenanceService.patchUserAlignment(authentication, userId, request);
    }
}
