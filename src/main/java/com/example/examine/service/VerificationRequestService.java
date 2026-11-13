package com.example.examine.service;

import com.example.examine.constant.ExamStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.constant.VerificationStatus;
import com.example.examine.entity.ExamEntity;
import com.example.examine.entity.StudentEntity;
import com.example.examine.entity.VerificationRequestEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.repository.ExamRepository;
import com.example.examine.repository.StudentRepository;
import com.example.examine.repository.VerificationRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * VerificationRequestService - Imtihon paytida yuz orqali to'liq o'ta olmagan
 * talabalar uchun xodimlar (staff) tomonidan qo'shma tasdiqlash so'rovlarini boshqarish xizmati.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class VerificationRequestService {

    private final VerificationRequestRepository verificationRequestRepository;
    private final StudentRepository studentRepository;
    private final ExamRepository examRepository;
    private final BiometricService biometricService;

    // Record ichidagi expiresAt ham Instant ga o'tkazildi
    public record Created(String requestId, String claimToken, VerificationStatus status, Instant expiresAt) {}

    public Created createRequest(String examId, String studentCode, String imageBase64, String ip, String ua) {
        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        if (exam.getStatus() != ExamStatus.PUBLISHED) {
            throw new CustomBadRequestException(ResponseType.EXAM_NOT_PUBLISHED);
        }

        StudentEntity student = studentRepository.findByStudentCode(studentCode)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));

        verificationRequestRepository.findByStudentIdAndStatus(student.getId(), VerificationStatus.PENDING)
                .ifPresent(existingRequest -> {
                    // OffsetDateTime.now() o'rniga Instant.now() va isAfter tekshiruvi
                    if (existingRequest.getExpiresAt() != null && existingRequest.getExpiresAt().isAfter(Instant.now())) {
                        throw new CustomBadRequestException(ResponseType.VERIFY_REQUEST_ALREADY_PENDING);
                    }
                });

        String claimToken = UUID.randomUUID().toString().replace("-", "");
        Instant expiresAtTime = Instant.now().plus(10, ChronoUnit.MINUTES);
        Instant ttlAtTime = Instant.now().plus(7, ChronoUnit.DAYS); // TTL uchun ham vaqt

        VerificationRequestEntity requestEntity = VerificationRequestEntity.builder()
                .examId(examId)
                .studentId(student.getId())
                .studentCode(studentCode)
                .status(VerificationStatus.PENDING)
                .expiresAt(expiresAtTime)
                .ttlAt(ttlAtTime) // TTL maydoni ham to'ldirildi
                .claimTokenHash(hashToken(claimToken))
                .build();

        VerificationRequestEntity savedRequest = verificationRequestRepository.save(requestEntity);
        biometricService.logBiometricEvent(student, examId, null, "fail", null, null, null, "verify-request");

        return new Created(savedRequest.getId(), claimToken, savedRequest.getStatus(), savedRequest.getExpiresAt());
    }

    public VerificationRequestEntity decide(String id, String staffId, boolean approve) {
        VerificationRequestEntity request = verificationRequestRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.VERIFY_REQUEST_NOT_FOUND));

        if (request.getStatus() != VerificationStatus.PENDING) {
            throw new CustomBadRequestException(ResponseType.VERIFY_REQUEST_EXPIRED);
        }

        request.setStatus(approve ? VerificationStatus.APPROVED : VerificationStatus.REJECTED);
        request.setDecidedBy(staffId);
        request.setDecidedAt(Instant.now()); // OffsetDateTime o'rniga Instant.now()
        request.setTtlAt(Instant.now().plus(7, ChronoUnit.DAYS)); // TTL 7 kundan keyin o'chishi uchun

        return verificationRequestRepository.save(request);
    }

    @Transactional(readOnly = true)
    public List<VerificationRequestEntity> listForStaff() {
        return verificationRequestRepository.findByStatusOrderByCreatedAtDesc(VerificationStatus.PENDING);
    }

    public VerificationRequestEntity poll(String id, String claimToken) {
        VerificationRequestEntity request = verificationRequestRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.VERIFY_REQUEST_NOT_FOUND));

        String tokenToVerify = (claimToken == null) ? "" : claimToken;
        if (!hashToken(tokenToVerify).equals(request.getClaimTokenHash())) {
            throw new CustomBadRequestException(ResponseType.VERIFY_CLAIM_TOKEN_INVALID);
        }

        if (request.getStatus() == VerificationStatus.PENDING && request.getExpiresAt() != null && request.getExpiresAt().isBefore(Instant.now())) {
            request.setStatus(VerificationStatus.EXPIRED);
            verificationRequestRepository.save(request);
        }

        return request;
    }

    /**
     * Kiosk approved natijani bir marta olib ketgani belgilanadi (CLAIMED).
     */
    public void markClaimed(String id) {
        verificationRequestRepository.findById(id).ifPresent(request -> {
            request.setStatus(VerificationStatus.CLAIMED);
            request.setTtlAt(Instant.now().plus(7, ChronoUnit.DAYS)); // Instant qo'shildi
            verificationRequestRepository.save(request);
        });
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 hashing failed", e);
        }
    }
}