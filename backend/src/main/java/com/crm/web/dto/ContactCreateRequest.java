package com.crm.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ContactCreateRequest(
        @NotBlank @Size(max = 120) @Pattern(regexp = "^[A-Za-z ]+$", message = "Agent Name can contain only letters and spaces.") String agentName,
        @NotBlank @Size(max = 120) @Pattern(regexp = "^[A-Za-z ]+$", message = "Name can contain only letters and spaces.") String name,
        @NotBlank @Size(max = 8) @Pattern(regexp = "^[0-9]+$", message = "Country code must contain digits only.") String countryCode,
        @NotBlank @Size(max = 20) @Pattern(regexp = "^[0-9]+$", message = "Phone number must contain digits only.") String phoneNumber,
        @NotBlank @Email @Size(max = 254) String email,
        @Size(max = 64) String product,
        @NotBlank @Size(max = 500) String purposeOfLoan,
        @Size(max = 500) String address,
        @Pattern(regexp = "^$|^[0-9]+(\\.[0-9]{1,2})?$", message = "Income must be a valid number.") String income,
        @NotBlank @Size(max = 64) String employmentStatus,
        @NotBlank @Pattern(regexp = "^(Yes|No)$", message = "Mortgage must be Yes or No.") String mortgage,
        @NotBlank @Pattern(regexp = "^(Yes|No)$", message = "Other existing loans must be Yes or No.") String otherExistingLoans,
        @NotBlank @Pattern(regexp = "^(Yes|No)$", message = "Credit Card must be Yes or No.") String creditCard,
        @Pattern(regexp = "^(People|Organization)$", message = "Type must be People or Organization.") String type,
        @Pattern(regexp = "^(Master List|Online)$", message = "Segment must be Master List or Online.") String segment,
        @Pattern(regexp = "^(Active|Inactive)$", message = "Status must be Active or Inactive.") String status,
        @Size(max = 30) String label,
        @Size(max = 150) String owner,
        @Size(max = 150) String subOwner,
        @Size(max = 150) String account
) {
}
