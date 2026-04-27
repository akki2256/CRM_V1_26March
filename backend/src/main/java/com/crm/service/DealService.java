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
import com.crm.web.dto.DealBulkUploadRequest;
import com.crm.web.dto.DealBulkUploadResponse;
import com.crm.web.dto.DealBulkUploadRowRequest;
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
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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

    @Transactional
    public DealBulkUploadResponse bulkUpload(DealBulkUploadRequest request, Authentication authentication) {
        if (!canEditContactAndAccount(authentication)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only administrators and managers can bulk upload deals.");
        }
        if (request == null || request.rows() == null || request.rows().isEmpty()) {
            return new DealBulkUploadResponse(false, 0, List.of("No rows found to upload."));
        }

        String actor = actorUsername(authentication);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<String> errors = new ArrayList<>();
        List<Deal> toSave = new ArrayList<>();
        Map<String, List<Long>> visibleContactIdsByName = new HashMap<>();
        for (var option : contactListQueryService.listContactsForDealForm(authentication)) {
            String key = normalizeLookupKey(option.contactName());
            if (key.isEmpty()) {
                continue;
            }
            visibleContactIdsByName.computeIfAbsent(key, k -> new ArrayList<>()).add(option.contactId());
        }
        Map<String, List<Long>> activeUserIdsByName = new HashMap<>();
        for (var option : appUserRepository.findActiveUsersForDealForm()) {
            String key = normalizeLookupKey(option.getFullName());
            if (key.isEmpty()) {
                continue;
            }
            activeUserIdsByName.computeIfAbsent(key, k -> new ArrayList<>()).add(option.getUserId());
        }
        Map<String, List<Long>> stageIdsByName = new HashMap<>();
        for (var stage : stageRepository.findAllByOrderByStageNameAsc()) {
            String key = normalizeLookupKey(stage.getStageName());
            if (key.isEmpty()) {
                continue;
            }
            stageIdsByName.computeIfAbsent(key, k -> new ArrayList<>()).add(stage.getStageId());
        }
        int idx = 1;
        for (DealBulkUploadRowRequest row : request.rows()) {
            validateAndBuildBulkRow(
                    row,
                    idx,
                    authentication,
                    actor,
                    now,
                    visibleContactIdsByName,
                    activeUserIdsByName,
                    stageIdsByName,
                    errors,
                    toSave);
            idx += 1;
        }
        if (!errors.isEmpty()) {
            return new DealBulkUploadResponse(false, 0, errors);
        }
        dealRepository.saveAll(toSave);
        return new DealBulkUploadResponse(true, toSave.size(), List.of());
    }

    private void validateAndBuildBulkRow(
            DealBulkUploadRowRequest row,
            int rowNumber,
            Authentication authentication,
            String actor,
            LocalDateTime now,
            Map<String, List<Long>> visibleContactIdsByName,
            Map<String, List<Long>> activeUserIdsByName,
            Map<String, List<Long>> stageIdsByName,
            List<String> errors,
            List<Deal> toSave) {
        int errorsBefore = errors.size();
        if (row == null) {
            errors.add("Row " + rowNumber + ": empty row.");
            return;
        }
        if (row.contactName() == null || row.contactName().trim().isEmpty()) {
            errors.add("Row " + rowNumber + ": Contact is required.");
        }
        if (row.userName() == null || row.userName().trim().isEmpty()) {
            errors.add("Row " + rowNumber + ": Deal user is required.");
        }
        if (row.stageName() == null || row.stageName().trim().isEmpty()) {
            errors.add("Row " + rowNumber + ": Stage is required.");
        }
        if (row.pipeline() == null || row.pipeline().trim().isEmpty()) {
            errors.add("Row " + rowNumber + ": Pipeline is required.");
        }
        if (row.currency() == null || row.currency().trim().isEmpty()) {
            errors.add("Row " + rowNumber + ": Currency is required.");
        }

        java.time.LocalDate closingDate;
        java.time.LocalDate dealDate;
        java.math.BigDecimal amount;
        try {
            closingDate = java.time.LocalDate.parse(row.closingDate());
        } catch (DateTimeParseException | NullPointerException ex) {
            errors.add("Row " + rowNumber + ": Closing date must be YYYY-MM-DD.");
            closingDate = null;
        }
        try {
            dealDate = java.time.LocalDate.parse(row.dealDate());
        } catch (DateTimeParseException | NullPointerException ex) {
            errors.add("Row " + rowNumber + ": Deal date must be YYYY-MM-DD.");
            dealDate = null;
        }
        try {
            amount = new java.math.BigDecimal(row.amount());
            if (amount.signum() < 0) {
                errors.add("Row " + rowNumber + ": Amount cannot be negative.");
            }
        } catch (NumberFormatException | NullPointerException ex) {
            errors.add("Row " + rowNumber + ": Amount must be numeric.");
            amount = null;
        }

        Contact contact = null;
        int contactErrorsBefore = errors.size();
        Long contactId = resolveVisibleContactId(row.contactName(), visibleContactIdsByName, rowNumber, errors);
        if (contactId != null) {
            contact = contactListQueryService.findVisibleContact(contactId, authentication).orElse(null);
        }
        if (contact == null && errors.size() == contactErrorsBefore) {
            errors.add("Row " + rowNumber + ": Contact not found or not visible.");
        }
        AppUser dealUser = null;
        int userErrorsBefore = errors.size();
        Long dealUserId = resolveActiveUserId(row.userName(), activeUserIdsByName, rowNumber, errors);
        if (dealUserId != null) {
            dealUser = appUserRepository.findById(dealUserId).orElse(null);
            if (dealUser == null && errors.size() == userErrorsBefore) {
                errors.add("Row " + rowNumber + ": Deal user not found.");
            } else if (dealUser.getUserStatus() != UserStatus.ACTIVE) {
                errors.add("Row " + rowNumber + ": Deal user is not active.");
            }
        }
        Stage stage = null;
        int stageErrorsBefore = errors.size();
        Long stageId = resolveStageId(row.stageName(), stageIdsByName, rowNumber, errors);
        if (stageId != null) {
            stage = stageRepository.findById(stageId).orElse(null);
        }
        if (stage == null && errors.size() == stageErrorsBefore) {
            errors.add("Row " + rowNumber + ": Stage not found.");
        }

        if (errors.size() > errorsBefore) {
            return;
        }

        Deal deal = new Deal();
        deal.setContact(contact);
        deal.setDealUser(dealUser);
        deal.setClosingDate(closingDate.atStartOfDay().atOffset(ZoneOffset.UTC).toLocalDateTime());
        deal.setStage(stage);
        deal.setAmount(amount);
        deal.setDealDate(dealDate.atStartOfDay().atOffset(ZoneOffset.UTC).toLocalDateTime());
        deal.setPipeline(row.pipeline().trim());
        deal.setCurrency(row.currency().trim().toUpperCase());
        deal.setDealComments(row.dealComments() == null || row.dealComments().trim().isEmpty() ? null : row.dealComments().trim());
        deal.setCreatedBy(actor);
        deal.setCreatedDate(now);
        deal.setLastUpdatedBy(actor);
        deal.setLastUpdatedDate(now);
        deal.setOcaControl(0L);
        toSave.add(deal);
    }

    private static Long resolveVisibleContactId(
            String contactValue, Map<String, List<Long>> visibleContactIdsByName, int rowNumber, List<String> errors) {
        if (contactValue == null || contactValue.trim().isEmpty()) {
            return null;
        }
        String trimmed = contactValue.trim();
        if (trimmed.matches("\\d+")) {
            return Long.parseLong(trimmed);
        }
        List<Long> candidates = visibleContactIdsByName.getOrDefault(normalizeLookupKey(trimmed), List.of());
        if (candidates.isEmpty()) {
            errors.add("Row " + rowNumber + ": Contact name not found in allowed list.");
            return null;
        }
        if (candidates.size() > 1) {
            errors.add("Row " + rowNumber + ": Contact name is ambiguous. Use a unique contact name.");
            return null;
        }
        return candidates.getFirst();
    }

    private static Long resolveActiveUserId(
            String userValue, Map<String, List<Long>> activeUserIdsByName, int rowNumber, List<String> errors) {
        if (userValue == null || userValue.trim().isEmpty()) {
            return null;
        }
        String trimmed = userValue.trim();
        if (trimmed.matches("\\d+")) {
            return Long.parseLong(trimmed);
        }
        List<Long> candidates = activeUserIdsByName.getOrDefault(normalizeLookupKey(trimmed), List.of());
        if (candidates.isEmpty()) {
            errors.add("Row " + rowNumber + ": Deal user name not found in allowed list.");
            return null;
        }
        if (candidates.size() > 1) {
            errors.add("Row " + rowNumber + ": Deal user name is ambiguous. Use a unique user name.");
            return null;
        }
        return candidates.getFirst();
    }

    private static Long resolveStageId(
            String stageValue, Map<String, List<Long>> stageIdsByName, int rowNumber, List<String> errors) {
        if (stageValue == null || stageValue.trim().isEmpty()) {
            return null;
        }
        String trimmed = stageValue.trim();
        if (trimmed.matches("\\d+")) {
            return Long.parseLong(trimmed);
        }
        List<Long> candidates = stageIdsByName.getOrDefault(normalizeLookupKey(trimmed), List.of());
        if (candidates.isEmpty()) {
            errors.add("Row " + rowNumber + ": Stage name not found in allowed list.");
            return null;
        }
        if (candidates.size() > 1) {
            errors.add("Row " + rowNumber + ": Stage name is ambiguous. Use a unique stage name.");
            return null;
        }
        return candidates.getFirst();
    }

    private static String normalizeLookupKey(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
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
