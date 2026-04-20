package com.crm.repo;

import com.crm.domain.Stage;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StageRepository extends JpaRepository<Stage, Long> {

    List<Stage> findAllByOrderByStageNameAsc();

    Optional<Stage> findByStageName(String stageName);
}
