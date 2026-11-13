package com.example.examine.controller;

import com.example.examine.config.security.JwtTokenDto;
import com.example.examine.constant.VerificationStatus;
import com.example.examine.dto.FaceAuthDto;
import com.example.examine.dto.FaceDto;
import com.example.examine.entity.BiometricEventEntity;
import com.example.examine.entity.VerificationRequestEntity;
import com.example.examine.exception.GlobalExceptionHandler;
import com.example.examine.service.BiometricService;
import com.example.examine.service.FaceAuthService;
import com.example.examine.service.StudentService;
import com.example.examine.service.VerificationRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FaceControllerTest {

    @Mock private FaceAuthService faceAuthService;
    @Mock private BiometricService biometricService;
    @Mock private StudentService studentService;
    @Mock private VerificationRequestService verificationRequestService;

    @InjectMocks
    private FaceController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private FaceAuthDto.FaceIdentifyResponse identity() {
        return new FaceAuthDto.FaceIdentifyResponse("Student", null, null, null,
                new FaceAuthDto.AssuranceDto(0.9, 0.2, "buffalo_s"));
    }

    @Test
    void identify_returnsIdentity() throws Exception {
        when(faceAuthService.identifyAndStartAttempt(any(), any(), any(), any())).thenReturn(identity());

        mockMvc.perform(post("/api/v1/face/identify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"examId\":\"exam-1\",\"imageBase64\":\"img\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.ownerType").value("Student"));
    }

    @Test
    void enroll_returnsResult() throws Exception {
        when(biometricService.enrollStudent(any(), any(), any()))
                .thenReturn(new BiometricService.EnrollResult(0.9, "buffalo_s"));

        mockMvc.perform(post("/api/v1/face/enroll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"s1\",\"imageBase64\":\"img\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.quality").value(0.9));
    }

    @Test
    void photo_returnsPhoto() throws Exception {
        when(studentService.getStudentPhoto("s1"))
                .thenReturn(new FaceDto.FacePhotoResponse("https://url", "faces/s1"));

        mockMvc.perform(get("/api/v1/face/s1/photo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.url").value("https://url"));
    }

    @Test
    void createVerifyRequest_returnsCreated() throws Exception {
        when(verificationRequestService.createRequest(any(), any(), any(), any(), any()))
                .thenReturn(new VerificationRequestService.Created(
                        "req-1", "claim", VerificationStatus.PENDING, Instant.now().plus(10, ChronoUnit.MINUTES)));

        mockMvc.perform(post("/api/v1/face/verify-request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"examId\":\"exam-1\",\"studentCode\":\"STU-1\",\"imageBase64\":\"img\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.requestId").value("req-1"))
                .andExpect(jsonPath("$.payload.status").value("pending"));
    }

    @Test
    void verifyRequestStatus_withIdentity_returnsIdentity() throws Exception {
        when(faceAuthService.claimApproved(any(), any(), any(), any()))
                .thenReturn(new FaceAuthService.ClaimResult("approved", identity()));

        mockMvc.perform(get("/api/v1/face/verify-request/req-1/status")
                        .header("x-claim-token", "claim"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.status").value("approved"))
                .andExpect(jsonPath("$.payload.identity.ownerType").value("Student"));
    }

    @Test
    void verifyRequestStatus_withoutIdentity_returnsStatusOnly() throws Exception {
        when(faceAuthService.claimApproved(any(), any(), any(), any()))
                .thenReturn(new FaceAuthService.ClaimResult("pending", null));

        mockMvc.perform(get("/api/v1/face/verify-request/req-1/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.status").value("pending"));
    }

    @Test
    void listVerifyRequests_returnsList() throws Exception {
        when(verificationRequestService.listForStaff()).thenReturn(List.of(
                VerificationRequestEntity.builder()
                        .id("req-1").examId("exam-1").studentId("s1").studentCode("STU-1")
                        .status(VerificationStatus.PENDING).build()));

        mockMvc.perform(get("/api/v1/face/verify-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload[0].id").value("req-1"));
    }

    @Test
    void approve_returnsApproved() throws Exception {
        when(verificationRequestService.decide(eq("req-1"), any(), eq(true))).thenReturn(
                VerificationRequestEntity.builder().id("req-1").status(VerificationStatus.APPROVED).build());

        mockMvc.perform(post("/api/v1/face/verify-requests/req-1/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.status").value("approved"));
    }

    @Test
    void deny_returnsRejected() throws Exception {
        when(verificationRequestService.decide(eq("req-1"), any(), eq(false))).thenReturn(
                VerificationRequestEntity.builder().id("req-1").status(VerificationStatus.REJECTED).build());

        mockMvc.perform(post("/api/v1/face/verify-requests/req-1/deny"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.status").value("rejected"));
    }

    @Test
    void revoke_asStaff_returnsOk() throws Exception {
        when(biometricService.revokeStudent(eq("s1"), any())).thenReturn(Map.of("ok", true));

        mockMvc.perform(delete("/api/v1/face/s1/revoke"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.ok").value(true));
    }

    @Test
    void revoke_asOtherStudent_returnsForbidden() throws Exception {
        JwtTokenDto jwtDto = new JwtTokenDto("s2", null, null, "Student", null, 0);

        mockMvc.perform(delete("/api/v1/face/s1/revoke").requestAttr("jwtDto", jwtDto))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(7));
    }

    @Test
    void audit_returnsEvents() throws Exception {
        when(biometricService.recentEvents(200)).thenReturn(List.of(
                BiometricEventEntity.builder().id("e1").event("identify").build()));

        mockMvc.perform(get("/api/v1/face/audit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload[0].id").value("e1"));
    }
}
