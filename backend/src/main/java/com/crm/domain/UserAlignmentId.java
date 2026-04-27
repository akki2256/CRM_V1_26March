package com.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class UserAlignmentId implements Serializable {

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "alignment_id")
    private Long alignmentId;

    public UserAlignmentId() {
    }

    public UserAlignmentId(Long userId, Long alignmentId) {
        this.userId = userId;
        this.alignmentId = alignmentId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getAlignmentId() {
        return alignmentId;
    }

    public void setAlignmentId(Long alignmentId) {
        this.alignmentId = alignmentId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        UserAlignmentId that = (UserAlignmentId) o;
        return Objects.equals(userId, that.userId) && Objects.equals(alignmentId, that.alignmentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, alignmentId);
    }
}
