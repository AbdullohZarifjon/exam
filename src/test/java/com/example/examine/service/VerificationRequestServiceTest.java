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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VerificationRequestServiceTest {

    @Mock private VerificationRequestRepository verificationRequestRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private ExamRepository examRepository;
    @Mock private BiometricService biometricService;

    @InjectMocks
    private VerificationRequestService service;

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private ExamEntity exam(ExamStatus status) {
        return ExamEntity.builder().id("exam-1").status(status).build();
    }

    private StudentEntity student() {
        return StudentEntity.builder().id("student-1").studentCode("STU-1").build();
    }

    @Test
    void createRequest_whenExamMissing_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createRequest("exam-1", "STU-1", "img", "ip", "ua"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void createRequest_whenExamNotPublished_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.DRAFT)));

        assertThatThrownBy(() -> service.createRequest("exam-1", "STU-1", "img", "ip", "ua"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_PUBLISHED.getMessageFormat());
    }

    @Test
    void createRequest_whenStudentMissing_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(studentRepository.findByStudentCode("STU-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createRequest("exam-1", "STU-1", "img", "ip", "ua"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void createRequest_whenPendingNotExpired_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(studentRepository.findByStudentCode("STU-1")).thenReturn(Optional.of(student()));
        when(verificationRequestRepository.findByStudentIdAndStatus("student-1", VerificationStatus.PENDING))
                .thenReturn(Optional.of(VerificationRequestEntity.builder()
                        .id("old")
                        .expiresAt(Instant.now().plus(5, ChronoUnit.MINUTES)) // Instant va ChronoUnit ishlatildi
                        .build()));

        assertThatThrownBy(() -> service.createRequest("exam-1", "STU-1", "img", "ip", "ua"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.VERIFY_REQUEST_ALREADY_PENDING.getMessageFormat());
    }

    @Test
    void createRequest_success_savesHashedTokenAndLogs() {
        StudentEntity student = student();
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(studentRepository.findByStudentCode("STU-1")).thenReturn(Optional.of(student));
        when(verificationRequestRepository.findByStudentIdAndStatus("student-1", VerificationStatus.PENDING))
                .thenReturn(Optional.empty());
        when(verificationRequestRepository.save(any(VerificationRequestEntity.class)))
                .thenAnswer(inv -> {
                    VerificationRequestEntity entity = inv.getArgument(0);
                    entity.setId("req-1");
                    return entity;
                });

        VerificationRequestService.Created created =
                service.createRequest("exam-1", "STU-1", "img", "ip", "ua");

        assertThat(created.requestId()).isEqualTo("req-1");
        assertThat(created.claimToken()).isNotBlank();
        assertThat(created.status()).isEqualTo(VerificationStatus.PENDING);
        assertThat(created.expiresAt()).isNotNull();
        ArgumentCaptor<VerificationRequestEntity> captor =
                ArgumentCaptor.forClass(VerificationRequestEntity.class);
        verify(verificationRequestRepository).save(captor.capture());
        assertThat(captor.getValue().getClaimTokenHash()).isEqualTo(hash(created.claimToken()));
        verify(biometricService).logBiometricEvent(eq(student), eq("exam-1"), eq(null),
                eq("fail"), eq(null), eq(null), eq(null), eq("verify-request"));
    }

    @Test
    void decide_whenMissing_throws() {
        when(verificationRequestRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.decide("missing", "staff", true))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.VERIFY_REQUEST_NOT_FOUND.getMessageFormat());
    }

    @Test
    void decide_whenNotPending_throws() {
        when(verificationRequestRepository.findById("req-1"))
                .thenReturn(Optional.of(VerificationRequestEntity.builder()
                        .id("req-1").status(VerificationStatus.APPROVED).build()));

        assertThatThrownBy(() -> service.decide("req-1", "staff", true))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.VERIFY_REQUEST_EXPIRED.getMessageFormat());
    }

    @Test
    void decide_approve_setsApproved() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").status(VerificationStatus.PENDING).build();
        when(verificationRequestRepository.findById("req-1")).thenReturn(Optional.of(request));
        when(verificationRequestRepository.save(request)).thenReturn(request);

        VerificationRequestEntity result = service.decide("req-1", "staff", true);

        assertThat(result.getStatus()).isEqualTo(VerificationStatus.APPROVED);
        assertThat(result.getDecidedBy()).isEqualTo("staff");
        assertThat(result.getDecidedAt()).isNotNull();
        assertThat(result.getTtlAt()).isNotNull();
    }

    @Test
    void decide_reject_setsRejected() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").status(VerificationStatus.PENDING).build();
        when(verificationRequestRepository.findById("req-1")).thenReturn(Optional.of(request));
        when(verificationRequestRepository.save(request)).thenReturn(request);

        VerificationRequestEntity result = service.decide("req-1", "staff", false);

        assertThat(result.getStatus()).isEqualTo(VerificationStatus.REJECTED);
    }

    @Test
    void listForStaff_returnsPendingRequests() {
        List<VerificationRequestEntity> pending = List.of(
                VerificationRequestEntity.builder().id("req-1").build());
        when(verificationRequestRepository.findByStatusOrderByCreatedAtDesc(VerificationStatus.PENDING))
                .thenReturn(pending);

        assertThat(service.listForStaff()).isEqualTo(pending);
    }

    @Test
    void poll_whenMissing_throws() {
        when(verificationRequestRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.poll("missing", "token"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.VERIFY_REQUEST_NOT_FOUND.getMessageFormat());
    }

    @Test
    void poll_withInvalidToken_throws() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").claimTokenHash(hash("correct")).build();
        when(verificationRequestRepository.findById("req-1")).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> service.poll("req-1", "wrong"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.VERIFY_CLAIM_TOKEN_INVALID.getMessageFormat());
    }

    @Test
    void poll_whenPendingExpired_marksExpired() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1")
                .status(VerificationStatus.PENDING)
                .claimTokenHash(hash("token"))
                .expiresAt(Instant.now().plus(1, ChronoUnit.MINUTES)) // Instant va ChronoUnit ishlatildi
                .build();
        when(verificationRequestRepository.findById("req-1")).thenReturn(Optional.of(request));

        VerificationRequestEntity result = service.poll("req-1", "token");

        assertThat(result.getStatus()).isEqualTo(VerificationStatus.EXPIRED);
        verify(verificationRequestRepository).save(request);
    }

    @Test
    void poll_withValidToken_returnsRequest() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1")
                .status(VerificationStatus.APPROVED)
                .claimTokenHash(hash("token"))
                .expiresAt(Instant.now().plus(5, ChronoUnit.MINUTES)) // Instant va ChronoUnit ishlatildi
                .build();
        when(verificationRequestRepository.findById("req-1")).thenReturn(Optional.of(request));

        assertThat(service.poll("req-1", "token")).isEqualTo(request);
    }

    @Test
    void markClaimed_setsClaimedStatus() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").status(VerificationStatus.APPROVED).build();
        when(verificationRequestRepository.findById("req-1")).thenReturn(Optional.of(request));

        service.markClaimed("req-1");

        assertThat(request.getStatus()).isEqualTo(VerificationStatus.CLAIMED);
        assertThat(request.getTtlAt()).isNotNull();
        verify(verificationRequestRepository).save(request);
    }

    @Test
    void markClaimed_whenMissing_doesNothing() {
        when(verificationRequestRepository.findById("missing")).thenReturn(Optional.empty());

        service.markClaimed("missing");

        verify(verificationRequestRepository, org.mockito.Mockito.never())
                .save(any(VerificationRequestEntity.class));
    }
}
