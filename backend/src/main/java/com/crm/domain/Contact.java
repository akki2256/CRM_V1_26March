package com.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "contact")
public class Contact {

    @Id
    @SequenceGenerator(name = "contactSeqGen", sequenceName = "seq_contact", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "contactSeqGen")
    @Column(name = "contact_id")
    private Long contactId;

    @Column(name = "agent_name", nullable = false, length = 120)
    private String agentName;

    @Column(name = "contact_name", nullable = false, length = 120)
    private String contactName;

    @Column(name = "country_code", nullable = false, length = 8)
    private String countryCode;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "email", nullable = false, length = 254)
    private String email;

    @Column(name = "product_code", length = 64)
    private String productCode;

    @Column(name = "purpose_of_loan", nullable = false, length = 500)
    private String purposeOfLoan;

    @Column(name = "address_text", length = 500)
    private String addressText;

    @Column(name = "customer_income", precision = 14, scale = 2)
    private BigDecimal customerIncome;

    @Column(name = "employment_status_code", nullable = false, length = 64)
    private String employmentStatusCode;

    @Column(name = "mortgage_yn", nullable = false, length = 1)
    private String mortgageYn;

    @Column(name = "other_existing_loans_yn", nullable = false, length = 1)
    private String otherExistingLoansYn;

    @Column(name = "credit_card_yn", nullable = false, length = 1)
    private String creditCardYn;

    @Column(name = "type_code", length = 20)
    private String typeCode;

    @Column(name = "segment_code", length = 30)
    private String segmentCode;

    @Column(name = "status_code", length = 20)
    private String statusCode;

    @Column(name = "label_code", length = 30)
    private String labelCode;

    @Column(name = "owner_name", length = 150)
    private String ownerName;

    @Column(name = "sub_owner_name", length = 150)
    private String subOwnerName;

    @Column(name = "account_name", length = 150)
    private String accountName;

    @Column(name = "created_dt", nullable = false)
    private LocalDateTime createdDt = LocalDateTime.now(ZoneOffset.UTC);

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "last_upd_dt", nullable = false)
    private LocalDateTime lastUpdDt = LocalDateTime.now(ZoneOffset.UTC);

    @Column(name = "last_upd_by", nullable = false, length = 100)
    private String lastUpdBy;

    @Column(name = "oca_control", nullable = false)
    private Long ocaControl = 0L;

    public Long getContactId() {
        return contactId;
    }

    public String getAgentName() {
        return agentName;
    }

    public void setAgentName(String agentName) {
        this.agentName = agentName;
    }

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getProductCode() {
        return productCode;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }

    public String getPurposeOfLoan() {
        return purposeOfLoan;
    }

    public void setPurposeOfLoan(String purposeOfLoan) {
        this.purposeOfLoan = purposeOfLoan;
    }

    public String getAddressText() {
        return addressText;
    }

    public void setAddressText(String addressText) {
        this.addressText = addressText;
    }

    public BigDecimal getCustomerIncome() {
        return customerIncome;
    }

    public void setCustomerIncome(BigDecimal customerIncome) {
        this.customerIncome = customerIncome;
    }

    public String getEmploymentStatusCode() {
        return employmentStatusCode;
    }

    public void setEmploymentStatusCode(String employmentStatusCode) {
        this.employmentStatusCode = employmentStatusCode;
    }

    public String getMortgageYn() {
        return mortgageYn;
    }

    public void setMortgageYn(String mortgageYn) {
        this.mortgageYn = mortgageYn;
    }

    public String getOtherExistingLoansYn() {
        return otherExistingLoansYn;
    }

    public void setOtherExistingLoansYn(String otherExistingLoansYn) {
        this.otherExistingLoansYn = otherExistingLoansYn;
    }

    public String getCreditCardYn() {
        return creditCardYn;
    }

    public void setCreditCardYn(String creditCardYn) {
        this.creditCardYn = creditCardYn;
    }

    public String getTypeCode() {
        return typeCode;
    }

    public void setTypeCode(String typeCode) {
        this.typeCode = typeCode;
    }

    public String getSegmentCode() {
        return segmentCode;
    }

    public void setSegmentCode(String segmentCode) {
        this.segmentCode = segmentCode;
    }

    public String getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(String statusCode) {
        this.statusCode = statusCode;
    }

    public String getLabelCode() {
        return labelCode;
    }

    public void setLabelCode(String labelCode) {
        this.labelCode = labelCode;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getSubOwnerName() {
        return subOwnerName;
    }

    public void setSubOwnerName(String subOwnerName) {
        this.subOwnerName = subOwnerName;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public LocalDateTime getCreatedDt() {
        return createdDt;
    }

    public void setCreatedDt(LocalDateTime createdDt) {
        this.createdDt = createdDt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getLastUpdDt() {
        return lastUpdDt;
    }

    public void setLastUpdDt(LocalDateTime lastUpdDt) {
        this.lastUpdDt = lastUpdDt;
    }

    public String getLastUpdBy() {
        return lastUpdBy;
    }

    public void setLastUpdBy(String lastUpdBy) {
        this.lastUpdBy = lastUpdBy;
    }

    public Long getOcaControl() {
        return ocaControl;
    }

    public void setOcaControl(Long ocaControl) {
        this.ocaControl = ocaControl;
    }
}
