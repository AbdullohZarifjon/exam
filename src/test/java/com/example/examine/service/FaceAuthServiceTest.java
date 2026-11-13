package com.example.examine.service;

import com.example.examine.config.security.CookieService;
import com.example.examine.config.security.JwtService;
import com.example.examine.constant.ExamStatus;
import com.example.examine.constant.FaceStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.constant.VerificationStatus;
import com.example.examine.dto.AttemptDto;
import com.example.examine.dto.ExamDto;
import com.example.examine.dto.FaceAuthDto;
import com.example.examine.dto.StudentDto;
import com.example.examine.entity.AttemptEntity;
import com.example.examine.entity.ExamEntity;
import com.example.examine.entity.StudentEntity;
import com.example.examine.entity.VerificationRequestEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.ExamMapper;
import com.example.examine.mapper.StudentMapper;
import com.example.examine.repository.AttemptRepository;
import com.example.examine.repository.ExamRepository;
import com.example.examine.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FaceAuthServiceTest {

    @Mock private FaceService faceService;
    @Mock private BiometricService biometricService;
    @Mock private AttemptService attemptService;
    @Mock private VerificationRequestService verificationRequestService;
    @Mock private StudentRepository studentRepository;
    @Mock private ExamRepository examRepository;
    @Mock private AttemptRepository attemptRepository;
    @Mock private JwtService jwtService;
    @Mock private CookieService cookieService;
    @Mock private StudentMapper studentMapper;
    @Mock private ExamMapper examMapper;

    @InjectMocks
    private FaceAuthService faceAuthService;

    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(faceAuthService, "accessValidity", 900L);
        ReflectionTestUtils.setField(faceAuthService, "refreshValidity", 2592000L);
        ReflectionTestUtils.setField(faceAuthService, "matchThreshold", 0.60);
        ReflectionTestUtils.setField(faceAuthService, "gapThreshold", 0.08);
        response = new MockHttpServletResponse();
    }

    private ExamEntity exam(ExamStatus status) {
        return ExamEntity.builder().id("exam-1").status(status).build();
    }

    private StudentEntity student(FaceStatus faceStatus, boolean active) {
        return StudentEntity.builder()
                .id("student-1")
                .fullName("Ali")
                .studentCode("STU-1")
                .isActive(active)
                .tokenVersion(0)
                .face(StudentEntity.Face.builder().status(faceStatus).build())
                .build();
    }

    private AttemptDto.AttemptResponse attemptResponse() {
        return new AttemptDto.AttemptResponse("attempt-1", "exam-1", "student-1", "in_progress",
                60, null, null, null, 0, 0, 0, 0, 0, null, List.of());
    }

    private Map<String, Object> embedResult() {
        return Map.of("embedding", List.of(0.1, 0.2, 0.3));
    }

    private Map<String, Object> identifyResult(List<Map<String, Object>> candidates) {
        return Map.of("candidates", candidates, "model", "buffalo_s");
    }

    @Test
    void identify_examNotFound_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void identify_examNotPublished_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.DRAFT)));

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_PUBLISHED.getMessageFormat());
    }

    @Test
    void identify_embeddingNull_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(faceService.embed("img")).thenReturn(Map.of());

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_NO_FACE_DETECTED.getMessageFormat());
    }

    @Test
    void identify_noCandidates_throwsAndLogs() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(faceService.embed("img")).thenReturn(embedResult());
        when(faceService.identifyByEmbedding(any())).thenReturn(identifyResult(List.of()));

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_MATCH_FAILED.getMessageFormat());
        verify(biometricService).logBiometricEvent(eq(null), eq("exam-1"), eq(null), eq("fail"),
                eq(0.0), eq(0.0), eq("buffalo_s"), eq("no-candidate"));
    }

    @Test
    void identify_studentNotFound_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(faceService.embed("img")).thenReturn(embedResult());
        when(faceService.identifyByEmbedding(any())).thenReturn(identifyResult(List.of(
                Map.of("studentId", "student-1", "score", 0.9))));
        when(studentRepository.findById("student-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void identify_studentInactive_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(faceService.embed("img")).thenReturn(embedResult());
        when(faceService.identifyByEmbedding(any())).thenReturn(identifyResult(List.of(
                Map.of("studentId", "student-1", "score", 0.9))));
        when(studentRepository.findById("student-1"))
                .thenReturn(Optional.of(student(FaceStatus.ENROLLED, false)));

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_INACTIVE.getMessageFormat());
    }

    @Test
    void identify_faceNotEnrolled_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(faceService.embed("img")).thenReturn(embedResult());
        when(faceService.identifyByEmbedding(any())).thenReturn(identifyResult(List.of(
                Map.of("studentId", "student-1", "score", 0.9))));
        when(studentRepository.findById("student-1"))
                .thenReturn(Optional.of(student(FaceStatus.NOT_ENROLLED, true)));

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_NOT_ENROLLED.getMessageFormat());
    }

    @Test
    void identify_ambiguous_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(faceService.embed("img")).thenReturn(embedResult());
        when(faceService.identifyByEmbedding(any())).thenReturn(identifyResult(List.of(
                Map.of("studentId", "student-1", "score", 0.9),
                Map.of("studentId", "student-2", "score", 0.8))));
        when(studentRepository.findById("student-1"))
                .thenReturn(Optional.of(student(FaceStatus.ENROLLED, true)));

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_AMBIGUOUS.getMessageFormat());
    }

    @Test
    void identify_scoreBelowThreshold_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(faceService.embed("img")).thenReturn(embedResult());
        when(faceService.identifyByEmbedding(any())).thenReturn(identifyResult(List.of(
                Map.of("studentId", "student-1", "score", 0.5))));
        when(studentRepository.findById("student-1"))
                .thenReturn(Optional.of(student(FaceStatus.ENROLLED, true)));

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_MATCH_FAILED.getMessageFormat());
    }

    @Test
    void identify_gapBelowThreshold_throws() {
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));
        when(faceService.embed("img")).thenReturn(embedResult());
        when(faceService.identifyByEmbedding(any())).thenReturn(identifyResult(List.of(
                Map.of("studentId", "student-1", "score", 0.65),
                Map.of("studentId", "student-2", "score", 0.59))));
        when(studentRepository.findById("student-1"))
                .thenReturn(Optional.of(student(FaceStatus.ENROLLED, true)));

        assertThatThrownBy(() -> faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_MATCH_FAILED.getMessageFormat());
    }

    @Test
    void identify_success_returnsIdentityAndStartsAttempt() {
        StudentEntity student = student(FaceStatus.ENROLLED, true);
        ExamEntity exam = exam(ExamStatus.PUBLISHED);
        AttemptEntity attemptEntity = AttemptEntity.builder().id("attempt-1").build();
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam));
        when(faceService.embed("img")).thenReturn(embedResult());
        when(faceService.identifyByEmbedding(any())).thenReturn(identifyResult(List.of(
                Map.of("studentId", "student-1", "score", 0.9))));
        when(studentRepository.findById("student-1")).thenReturn(Optional.of(student));
        when(jwtService.generateAccess("student-1", null, null, "Student", "exam-1", 0)).thenReturn("access");
        when(jwtService.generateRefresh("student-1", null, null, "Student", "exam-1", 0)).thenReturn("refresh");
        when(attemptService.startExam("exam-1", "student-1")).thenReturn(attemptResponse());
        when(attemptRepository.findById("attempt-1")).thenReturn(Optional.of(attemptEntity));
        when(studentMapper.toPublicDto(student)).thenReturn(
                new StudentDto.PublicStudentResponse("student-1", "Ali", "STU-1", "ENROLLED"));
        when(examMapper.toDto(exam)).thenReturn(new ExamDto.ExamResponse(
                "exam-1", "Exam", null, ExamStatus.PUBLISHED, 60, 1, null, null, "user-1", null, null));

        FaceAuthDto.FaceIdentifyResponse result =
                faceAuthService.identifyAndStartAttempt("img", "exam-1", "ip", response);

        assertThat(result.ownerType()).isEqualTo("Student");
        assertThat(result.student()).isNotNull();
        assertThat(result.exam()).isNotNull();
        assertThat(result.attempt()).isNotNull();
        assertThat(result.assurance().score()).isEqualTo(0.9);
        assertThat(result.assurance().model()).isEqualTo("buffalo_s");
        assertThat(attemptEntity.getIdentityMethod()).isEqualTo("face");
        assertThat(attemptEntity.getIdentityVerifiedAt()).isNotNull();
        assertThat(attemptEntity.getIdentityScore()).isEqualTo(0.9);
        verify(cookieService).setAccess(response, "access", 900L);
        verify(cookieService).setRefresh(response, "refresh", 2592000L);
        verify(attemptRepository).save(attemptEntity);
        verify(biometricService).logBiometricEvent(eq(student), eq("exam-1"), eq("attempt-1"),
                eq("identify"), eq(0.9), eq(0.9), eq("buffalo_s"), eq("ip"));
    }

    @Test
    void claimApproved_pending_returnsStatusWithoutIdentity() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").status(VerificationStatus.PENDING).build();
        when(verificationRequestService.poll("req-1", "token")).thenReturn(request);

        FaceAuthService.ClaimResult result =
                faceAuthService.claimApproved("req-1", "token", "ip", response);

        assertThat(result.status()).isEqualTo("pending");
        assertThat(result.identity()).isNull();
        verify(attemptService, never()).startExam(anyString(), anyString());
    }

    @Test
    void claimApproved_approved_studentNotFound_throws() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").status(VerificationStatus.APPROVED).studentId("student-1").build();
        when(verificationRequestService.poll("req-1", "token")).thenReturn(request);
        when(studentRepository.findById("student-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> faceAuthService.claimApproved("req-1", "token", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void claimApproved_approved_studentInactive_throws() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").status(VerificationStatus.APPROVED).studentId("student-1").build();
        when(verificationRequestService.poll("req-1", "token")).thenReturn(request);
        when(studentRepository.findById("student-1"))
                .thenReturn(Optional.of(student(FaceStatus.ENROLLED, false)));

        assertThatThrownBy(() -> faceAuthService.claimApproved("req-1", "token", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_INACTIVE.getMessageFormat());
    }

    @Test
    void claimApproved_approved_examNotFound_throws() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").status(VerificationStatus.APPROVED)
                .studentId("student-1").examId("exam-1").build();
        when(verificationRequestService.poll("req-1", "token")).thenReturn(request);
        when(studentRepository.findById("student-1"))
                .thenReturn(Optional.of(student(FaceStatus.ENROLLED, true)));
        when(examRepository.findById("exam-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> faceAuthService.claimApproved("req-1", "token", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void claimApproved_approved_examNotPublished_throws() {
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").status(VerificationStatus.APPROVED)
                .studentId("student-1").examId("exam-1").build();
        when(verificationRequestService.poll("req-1", "token")).thenReturn(request);
        when(studentRepository.findById("student-1"))
                .thenReturn(Optional.of(student(FaceStatus.ENROLLED, true)));
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.DRAFT)));

        assertThatThrownBy(() -> faceAuthService.claimApproved("req-1", "token", "ip", response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_PUBLISHED.getMessageFormat());
    }

    @Test
    void claimApproved_approved_success_returnsIdentityAndClaims() {
        StudentEntity student = student(FaceStatus.ENROLLED, true);
        ExamEntity exam = exam(ExamStatus.PUBLISHED);
        AttemptEntity attemptEntity = AttemptEntity.builder().id("attempt-1").build();
        VerificationRequestEntity request = VerificationRequestEntity.builder()
                .id("req-1").status(VerificationStatus.APPROVED)
                .studentId("student-1").examId("exam-1").build();
        when(verificationRequestService.poll("req-1", "token")).thenReturn(request);
        when(studentRepository.findById("student-1")).thenReturn(Optional.of(student));
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam));
        when(jwtService.generateAccess("student-1", null, null, "Student", "exam-1", 0)).thenReturn("access");
        when(jwtService.generateRefresh("student-1", null, null, "Student", "exam-1", 0)).thenReturn("refresh");
        when(attemptService.startExam("exam-1", "student-1")).thenReturn(attemptResponse());
        when(attemptRepository.findById("attempt-1")).thenReturn(Optional.of(attemptEntity));
        when(studentMapper.toPublicDto(student)).thenReturn(
                new StudentDto.PublicStudentResponse("student-1", "Ali", "STU-1", "ENROLLED"));
        when(examMapper.toDto(exam)).thenReturn(new ExamDto.ExamResponse(
                "exam-1", "Exam", null, ExamStatus.PUBLISHED, 60, 1, null, null, "user-1", null, null));

        FaceAuthService.ClaimResult result =
                faceAuthService.claimApproved("req-1", "token", "ip", response);

        assertThat(result.status()).isEqualTo("approved");
        assertThat(result.identity()).isNotNull();
        assertThat(attemptEntity.getIdentityMethod()).isEqualTo("staff-verified");
        verify(verificationRequestService).markClaimed("req-1");
        verify(biometricService).logBiometricEvent(eq(student), eq("exam-1"), eq("attempt-1"),
                eq("override"), eq(null), eq(null), eq(null), eq("staff-approved"));
    }
}
