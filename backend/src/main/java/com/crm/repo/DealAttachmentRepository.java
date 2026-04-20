package com.crm.repo;

import com.crm.domain.DealAttachment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DealAttachmentRepository extends JpaRepository<DealAttachment, Long> {

    List<DealAttachment> findByDealDealIdOrderByUploadedAtDesc(Long dealId);
}
