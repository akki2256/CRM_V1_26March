package com.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "ALIGNMENTS")
public class Alignment {

    @Id
    @SequenceGenerator(name = "alignmentsSeqGen", sequenceName = "seq_alignment", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "alignmentsSeqGen")
    @Column(name = "alignment_id")
    private Long alignmentId;

    @Column(name = "alignment_name", nullable = false, unique = true, length = 120)
    private String alignmentName;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_date", nullable = false)
    private LocalDateTime createdDate = LocalDateTime.now(ZoneOffset.UTC);

    @Column(name = "last_updated_by", nullable = false, length = 100)
    private String lastUpdatedBy;

    @Column(name = "last_updated_date", nullable = false)
    private LocalDateTime lastUpdatedDate = LocalDateTime.now(ZoneOffset.UTC);

    @Column(name = "oca_control", nullable = false)
    private Long ocaControl = 0L;

    public Long getAlignmentId() {
        return alignmentId;
    }

    public String getAlignmentName() {
        return alignmentName;
    }

    public void setAlignmentName(String alignmentName) {
        this.alignmentName = alignmentName;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }

    public String getLastUpdatedBy() {
        return lastUpdatedBy;
    }

    public void setLastUpdatedBy(String lastUpdatedBy) {
        this.lastUpdatedBy = lastUpdatedBy;
    }

    public LocalDateTime getLastUpdatedDate() {
        return lastUpdatedDate;
    }

    public void setLastUpdatedDate(LocalDateTime lastUpdatedDate) {
        this.lastUpdatedDate = lastUpdatedDate;
    }

    public Long getOcaControl() {
        return ocaControl;
    }

    public void setOcaControl(Long ocaControl) {
        this.ocaControl = ocaControl;
    }
}
