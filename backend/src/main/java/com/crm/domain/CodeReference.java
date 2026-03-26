package com.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "code_reference")
@IdClass(CodeReferenceId.class)
public class CodeReference {

    @Id
    @Column(name = "category_sid", nullable = false, length = 64)
    private String categorySid;

    @Id
    @Column(name = "code", nullable = false, length = 128)
    private String code;

    @Column(name = "sequence_no", nullable = false)
    private Integer sequenceNo;

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

    public String getCategorySid() {
        return categorySid;
    }

    public void setCategorySid(String categorySid) {
        this.categorySid = categorySid;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Integer getSequenceNo() {
        return sequenceNo;
    }

    public void setSequenceNo(Integer sequenceNo) {
        this.sequenceNo = sequenceNo;
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
