package com.crm.repo;

import com.crm.domain.AppUser;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsernameIgnoreCase(String username);

    Optional<AppUser> findByEmailIgnoreCase(String email);

    @Query("""
            select distinct concat(u.firstName, ' ', u.lastName)
            from AppUser u
            join UserGroup ug on ug.user = u
            join ug.group g
            where upper(g.groupName) = 'ADMIN'
            order by concat(u.firstName, ' ', u.lastName)
            """)
    List<String> findDistinctAdminFullNames();

    @Query("""
            select distinct concat(u.firstName, ' ', u.lastName)
            from AppUser u
            where u.userStatus = com.crm.domain.UserStatus.ACTIVE
            order by concat(u.firstName, ' ', u.lastName)
            """)
    List<String> findDistinctActiveFullNames();
}
