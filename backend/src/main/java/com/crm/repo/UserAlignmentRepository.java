package com.crm.repo;

import com.crm.domain.UserAlignment;
import com.crm.domain.UserAlignmentId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserAlignmentRepository extends JpaRepository<UserAlignment, UserAlignmentId> {

    @Query("select ua from UserAlignment ua join fetch ua.user join fetch ua.alignment")
    List<UserAlignment> findAllWithUserAndAlignment();

    void deleteByUserUserId(Long userId);

    @Query("select ua from UserAlignment ua join fetch ua.alignment where ua.id.userId = :userId")
    List<UserAlignment> findAllWithAlignmentByUserId(@Param("userId") Long userId);
}
