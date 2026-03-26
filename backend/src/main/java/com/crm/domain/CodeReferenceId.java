package com.crm.domain;

import java.io.Serializable;
import java.util.Objects;

public class CodeReferenceId implements Serializable {

    private String categorySid;
    private String code;

    public CodeReferenceId() {
    }

    public CodeReferenceId(String categorySid, String code) {
        this.categorySid = categorySid;
        this.code = code;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof CodeReferenceId that)) {
            return false;
        }
        return Objects.equals(categorySid, that.categorySid) && Objects.equals(code, that.code);
    }

    @Override
    public int hashCode() {
        return Objects.hash(categorySid, code);
    }
}
