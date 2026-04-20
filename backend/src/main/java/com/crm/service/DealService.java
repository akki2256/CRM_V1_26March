package com.crm.service;

import com.crm.domain.AppUser;
import com.crm.domain.Contact;
import com.crm.domain.Deal;
import com.crm.domain.DealAttachment;
import com.crm.domain.Stage;
import com.crm.domain.UserStatus;
import com.crm.repo.AppUserRepository;
import com.crm.repo.ContactRepository;
import com.crm.repo.DealAttachmentRepository;
import com.crm.repo.DealRepository;
import com.crm.repo.StageRepository;
import com.crm.security.JwtUserPrincipal;
import com.crm.web.ApiException;
import com.crm.web.dto.DealAccountPatchRequest;
import com.crm.web.dto.DealAttachmentRowDto;
import com.crm.web.dto.DealContactPatchRequest;
import com.crm.web.dto.DealCreateRequest;
import com.crm.web.dto.DealCreateResponse;
import com.crm.web.dto.DealDetailResponse;
import com.crm.web.dto.DealFormOptionsResponse;
import com.crm.web.dto.DealStageOptionResponse;
import com.crm.web.dto.DealStagePatchRequest;
import com.crm.web.dto.DealUserOptionResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DealService {

    private static final Set<String> STAGE_PATCH_ALLOWED = Set.of("Closed Won", "Closed Lost");

    private final DealRepository dealRepository;
    private final StageRepository stageRepository;
    private final AppUserRepository appUserRepository;
    private final ContactListQueryService contactListQueryService;
    private final DealListQueryService dealListQueryService;
    private final ContactRepository contactRepository;
    private final UserDirectoryService userDirectoryService;
    private final DealAttachmentRepository dealAttachmentRepository;

    @Value("${app.deal-uploads-dir:deal-uploads}")
    private String dealUploadsDir;

    public DealService(
            DealRepository dealRepository,
            StageRepository stageRepository,
            AppUserRepository appUserRepository,
            ContactListQueryService contactListQueryService,
            DealListQueryService dealListQueryService,
            ContactRepository contactRepository,
            UserDirectoryService userDirectoryService,
            DealAttachmentRepository dealAttachmentRepository) {
        this.dealRepository = dealRepository;
        this.stageRepository = stageRepository;
        this.appUserRepository = appUserRepository;
        this.contactListQueryService = contactListQueryService;
        this.dealListQueryService = dealListQueryService;
        this.contactRepository = contactRepository;
        this.userDirectoryService = userDirectoryService;
        this.dealAttachmentRepository = dealAttachmentRepository;
    }

    @Transactional(readOnly = true)
    public DealFormOptionsResponse formOptions(Authentication authentication) {
        var contacts = contactListQueryService.listContactsForDealForm(authentication);
        var users = appUserRepository.findActiveUsersForDealForm().stream()
                .map(r -> new DealUserOptionResponse(r.getUserId(), r.getFullName()))
                .toList();
        var stages = stageRepository.findAllByOrderByStageNameAsc().stream()
                .map(s -> new DealStageOptionResponse(s.getStageId(), s.getStageName()))
                .toList();
        return new DealFormOptionsResponse(contacts, users, stages);
    }

    @Transactional(readOnly = true)
    public DealDetailResponse getDetail(long dealId, Authentication authentication) {
        Deal deal = dealListQueryService.requireVisibleDeal(dealId, authentication);
        boolean canEdit = canEditContactAndAccount(authentication);
        return toDetail(deal, canEdit);
    }

    @Transactional
    public void updateStage(long dealId, DealStagePatchRequest request, Authentication authentication) {
        String name = request.stageName() == null ? "" : request.stageName().trim();
        if (!STAGE_PATCH_ALLOWED.contains(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "stageName must be Closed Won or Closed Lost.");
        }
        Deal deal = dealListQueryService.requireVisibleDeal(dealId, authentication);
        Stage stage = stageRepository
                .findByStageName(name)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Stage not found: " + name));
        String actor = actorUsername(authentication);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        deal.setStage(stage);
        deal.setLastUpdatedBy(actor);
        deal.setLastUpdatedDate(now);
        dealRepository.save(deal);
    }

    @Transactional
    public void updateContact(long dealId, DealContactPatchRequest request, Authentication authentication) {
        if (!canEditContactAndAccount(authentication)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only administrators and managers can change the contact.");
        }
        Deal deal = dealListQueryService.requireVisibleDeal(dealId, authentication);
        Contact next = contactListQueryService.requireVisibleContact(request.contactId(), authentication);
        String actor = actorUsername(authentication);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        deal.setContact(next);
        deal.setLastUpdatedBy(actor);
        deal.setLastUpdatedDate(now);
        dealRepository.save(deal);
    }

    @Transactional
    public void updateAccount(long dealId, DealAccountPatchRequest request, Authentication authentication) {
        if (!canEditContactAndAccount(authentication)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only administrators and managers can change the account.");
        }
        Deal deal = dealListQueryService.requireVisibleDeal(dealId, authentication);
        Contact c = deal.getContact();
        c.setAccountName(request.accountName().trim());
        String actor = actorUsername(authentication);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        c.setLastUpdBy(actor);
        c.setLastUpdDt(now);
        contactRepository.save(c);
        deal.setLastUpdatedBy(actor);
        deal.setLastUpdatedDate(now);
        dealRepository.save(deal);
    }

    @Transactional(readOnly = true)
    public List<DealAttachmentRowDto> listAttachments(long dealId, Authentication authentication) {
        dealListQueryService.requireVisibleDeal(dealId, authentication);
        return dealAttachmentRepository.findByDealDealIdOrderByUploadedAtDesc(dealId).stream()
                .map(a -> new DealAttachmentRowDto(
                        a.getAttachmentId(),
                        a.getFileName(),
                        a.getUploadedAt() == null ? "" : a.getUploadedAt().toString()))
                .toList();
    }

    @Transactional
    public DealAttachmentRowDto addAttachment(long dealId, MultipartFile file, Authentication authentication) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is required.");
        }
        Deal deal = dealListQueryService.requireVisibleDeal(dealId, authentication);
        String actor = actorUsername(authentication);
        Path root = Paths.get(dealUploadsDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not create upload directory.");
        }
        Path dealDir = root.resolve("deal-" + dealId).normalize();
        if (!dealDir.startsWith(root)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid upload path.");
        }
        try {
            Files.createDirectories(dealDir);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not create deal upload directory.");
        }
        String original = file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename();
        String safe = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (safe.isBlank()) {
            safe = "file";
        }
        String storedFileName = UUID.randomUUID() + "_" + safe;
        Path target = dealDir.resolve(storedFileName).normalize();
        if (!target.startsWith(dealDir)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid file name.");
        }
        try {
            file.transferTo(target.toFile());
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store file.");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        DealAttachment att = new DealAttachment();
        att.setDeal(deal);
        att.setFileName(original.length() > 500 ? original.substring(0, 500) : original);
        att.setContentType(file.getContentType());
        att.setStoredPath(target.toString());
        att.setUploadedAt(now);
        att.setUploadedBy(actor);
        att.setOcaControl(0L);
        dealAttachmentRepository.save(att);

        return new DealAttachmentRowDto(att.getAttachmentId(), att.getFileName(), att.getUploadedAt().toString());
    }

    @Transactional
    public DealCreateResponse create(DealCreateRequest request, Authentication authentication) {
        String actor = "SYSTEM";
        if (authentication != null && authentication.getPrincipal() instanceof JwtUserPrincipal p) {
            actor = p.getUsername();
        }

        Contact contact = contactListQueryService.requireVisibleContact(request.contactId(), authentication);
        AppUser dealUser = appUserRepository
                .findById(request.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "User not found."));
        if (dealUser.getUserStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Selected user is not active.");
        }
        Stage stage = stageRepository
                .findById(request.stageId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Stage not found."));

        LocalDateTime closingAt = request.closingDate().atStartOfDay().atOffset(ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime dealAt = request.dealDate().atStartOfDay().atOffset(ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        Deal deal = new Deal();
        deal.setContact(contact);
        deal.setDealUser(dealUser);
        deal.setClosingDate(closingAt);
        deal.setStage(stage);
        deal.setAmount(request.amount());
        deal.setDealDate(dealAt);
        deal.setPipeline(request.pipeline().trim());
        deal.setCurrency(request.currency().trim().toUpperCase());
        deal.setDealComments(null);
        deal.setCreatedBy(actor);
        deal.setCreatedDate(now);
        deal.setLastUpdatedBy(actor);
        deal.setLastUpdatedDate(now);
        deal.setOcaControl(0L);

        dealRepository.save(deal);
        return new DealCreateResponse(deal.getDealId(), "Deal created successfully.");
    }

    private static DealDetailResponse toDetail(Deal d, boolean canEdit) {
        Contact c = d.getContact();
        AppUser u = d.getDealUser();
        Stage s = d.getStage();
        String dealUserName = (u.getFirstName() + " " + u.getLastName()).trim();
        String comments = d.getDealComments() == null ? "" : d.getDealComments().trim();
        String purpose = c.getPurposeOfLoan() == null ? "" : c.getPurposeOfLoan().trim();
        return new DealDetailResponse(
                d.getDealId(),
                c.getContactId(),
                nz(c.getContactName()),
                purpose,
                nz(c.getOwnerName()),
                nz(c.getSubOwnerName()),
                nz(c.getAccountName()),
                u.getUserId(),
                dealUserName.isEmpty() ? "—" : dealUserName,
                d.getClosingDate() == null ? "" : d.getClosingDate().toString(),
                s.getStageId(),
                nz(s.getStageName()),
                d.getAmount(),
                d.getDealDate() == null ? "" : d.getDealDate().toString(),
                d.getPipeline(),
                d.getCurrency(),
                comments,
                canEdit);
    }

    private static String nz(String v) {
        if (v == null || v.isBlank()) {
            return "—";
        }
        return v.trim();
    }

    private boolean canEditContactAndAccount(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtUserPrincipal principal)) {
            return false;
        }
        List<String> groups = userDirectoryService.groupNamesForUser(principal.getUserId());
        return groups.stream()
                .anyMatch(g -> g != null
                        && (g.equalsIgnoreCase("admin") || g.equalsIgnoreCase("manager")));
    }

    private static String actorUsername(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof JwtUserPrincipal p) {
            return p.getUsername();
        }
        return "SYSTEM";
    }
}
