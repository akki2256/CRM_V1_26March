package com.crm.repo;

import com.crm.domain.UserGroup;
import com.crm.domain.UserGroupId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserGroupRepository extends JpaRepository<UserGroup, UserGroupId> {

    @Query("select ug from UserGroup ug join fetch ug.group where ug.id.userId = :userId")
    List<UserGroup> findAllWithGroupByUserId(@Param("userId") Long userId);

    @Query("select ug from UserGroup ug join fetch ug.user join fetch ug.group")
    List<UserGroup> findAllWithUserAndGroup();
}
