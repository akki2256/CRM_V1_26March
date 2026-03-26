package com.crm.repo;

import com.crm.domain.CodeReference;
import com.crm.domain.CodeReferenceId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CodeReferenceRepository extends JpaRepository<CodeReference, CodeReferenceId> {

    List<CodeReference> findByCategorySidOrderBySequenceNoAsc(String categorySid);
}
