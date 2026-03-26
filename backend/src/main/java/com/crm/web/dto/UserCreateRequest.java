package com.crm.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank @Size(max = 100) String username,
        @NotBlank @Size(max = 100) @Pattern(regexp = "^[A-Za-z ]+$", message = "First Name can contain only letters and spaces.") String firstName,
        @NotBlank @Size(max = 100) @Pattern(regexp = "^[A-Za-z ]+$", message = "Last Name can contain only letters and spaces.") String lastName,
        @NotBlank String userGroup,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = "^[0-9]+$", message = "Phone Number must contain digits only.") @Size(max = 50) String phoneNumber,
        String addToGroup
) {
}
