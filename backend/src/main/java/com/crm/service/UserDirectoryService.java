package com.crm.service;

import com.crm.repo.UserGroupRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDirectoryService {

    private final UserGroupRepository userGroupRepository;

    public UserDirectoryService(UserGroupRepository userGroupRepository) {
        this.userGroupRepository = userGroupRepository;
    }

    @Transactional(readOnly = true)
    public List<String> groupNamesForUser(Long userId) {
        return userGroupRepository.findAllWithGroupByUserId(userId).stream()
                .map(ug -> ug.getGroup().getGroupName())
                .sorted()
                .toList();
    }
}
