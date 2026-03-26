package com.crm.repo;

import com.crm.domain.CrmGroup;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrmGroupRepository extends JpaRepository<CrmGroup, Long> {

    Optional<CrmGroup> findByGroupNameIgnoreCase(String groupName);

    List<CrmGroup> findAllByOrderByGroupNameAsc();
}
