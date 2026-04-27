package com.crm.repo;

import com.crm.domain.Alignment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlignmentRepository extends JpaRepository<Alignment, Long> {

    List<Alignment> findAllByOrderByAlignmentNameAsc();

    Optional<Alignment> findByAlignmentNameIgnoreCase(String alignmentName);
}
