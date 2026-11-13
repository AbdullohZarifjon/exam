package com.example.examine.controller;

import com.example.examine.config.security.JwtTokenDto;
import com.example.examine.dto.FaceAuthDto;
import com.example.examine.dto.FaceDto;
import com.example.examine.dto.ResponseDto;
import com.example.examine.entity.BiometricEventEntity;
import com.example.examine.service.BiometricService;
import com.example.examine.service.FaceAuthService;
import com.example.examine.service.StudentService;
import com.example.examine.service.VerificationRequestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FaceController - Yuz biometriyasi orqali avtorizatsiya va imtihonga kirish
 * jarayonlarini boshqaruvchi toza REST API controller (Biznes-logikasiz).
 */
@RestController
@RequestMapping("/api/v1/face")
@RequiredArgsConstructor
public class FaceController {

    private final FaceAuthService faceAuthService;
    private final BiometricService biometricService;
    private final StudentService studentService;
    private final VerificationRequestService verificationRequestService;

    /**
     * 1. Yuz orqali talabani aniqlash, token berish va imtihonni boshlash.
     * POST /api/v1/face/identify
     */
    @PostMapping("/identify")
    public ResponseEntity<ResponseDto<FaceAuthDto.FaceIdentifyResponse>> identify(
            @Valid @RequestBody FaceAuthDto.FaceIdentifyRequest dto,
            HttpServletRequest request,
            HttpServletResponse response) {

        FaceAuthDto.FaceIdentifyResponse result = faceAuthService.identifyAndStartAttempt(
                dto.imageBase64(),
                dto.examId(),
                request.getRemoteAddr(),
                response
        );

        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }

    /**
     * 2. Talabaning yuzini ro'yxatdan o'tkazish (Enrollment).
     * POST /api/v1/face/enroll
     */
    @PostMapping("/enroll")
    public ResponseEntity<ResponseDto<Object>> enroll(
            @Valid @RequestBody FaceDto.FaceEnrollRequest dto,
            HttpServletRequest request) {

        JwtTokenDto jwtDto = (JwtTokenDto) request.getAttribute("jwtDto");
        Object result = biometricService.enrollStudent(dto.studentId(), dto.imageBase64(), jwtDto != null ? jwtDto.id() : null);

        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }

    /**
     * 3. Talabaning ro'yxatdan o'tgan yuz rasmini olish.
     * GET /api/v1/face/{studentId}/photo
     */
    @GetMapping("/{studentId}/photo")
    public ResponseEntity<ResponseDto<FaceDto.FacePhotoResponse>> photo(@PathVariable String studentId) {
        FaceDto.FacePhotoResponse response = studentService.getStudentPhoto(studentId);
        return ResponseEntity.ok(ResponseDto.getSuccess(response));
    }

    /**
     * 4. Kiosk: look-alike talaba kod + jonli selfie bilan staff tasdig'ini so'raydi.
     * POST /api/v1/face/verify-request
     */
    @PostMapping("/verify-request")
    public ResponseEntity<ResponseDto<FaceDto.VerifyRequestCreatedResponse>> createVerifyRequest(
            @Valid @RequestBody FaceDto.VerifyRequestCreateRequest dto,
            HttpServletRequest request) {

        var created = verificationRequestService.createRequest(
                dto.examId(),
                dto.studentCode(),
                dto.imageBase64(),
                request.getRemoteAddr(),
                request.getHeader("User-Agent")
        );

        FaceDto.VerifyRequestCreatedResponse response = new FaceDto.VerifyRequestCreatedResponse(
                created.requestId(),
                created.claimToken(),
                created.status() != null ? created.status().name().toLowerCase() : null,
                created.expiresAt() != null ? created.expiresAt().toString() : null
        );

        return ResponseEntity.ok(ResponseDto.getSuccess(response));
    }

    /**
     * 5. Kiosk: tasdiqlash so'rovi holatini so'rash (10 sekundda bir marta).
     * APPROVED bo'lsa — bir marta claim qilinadi: attempt + cookie'lar qaytariladi.
     * GET /api/v1/face/verify-request/{id}/status
     */
    @GetMapping("/verify-request/{id}/status")
    public ResponseEntity<ResponseDto<Map<String, Object>>> verifyRequestStatus(
            @PathVariable String id,
            @RequestHeader(value = "x-claim-token", required = false) String claimToken,
            HttpServletRequest request,
            HttpServletResponse response) {

        FaceAuthService.ClaimResult result = faceAuthService.claimApproved(
                id, claimToken, request.getRemoteAddr(), response
        );

        if (result.identity() != null) {
            return ResponseEntity.ok(ResponseDto.getSuccess(Map.of(
                    "status", result.status(),
                    "identity", result.identity()
            )));
        }

        return ResponseEntity.ok(ResponseDto.getSuccess(Map.of("status", result.status())));
    }

    /**
     * 6. Staff navbati (Verification tab): pending so'rovlar ro'yxati.
     * GET /api/v1/face/verify-requests
     */
    @GetMapping("/verify-requests")
    public ResponseEntity<ResponseDto<List<FaceDto.VerifyRequestStaffResponse>>> listVerifyRequests() {
        List<FaceDto.VerifyRequestStaffResponse> items = verificationRequestService.listForStaff().stream()
                .map(r -> new FaceDto.VerifyRequestStaffResponse(
                        r.getId(),
                        r.getExamId(),
                        r.getStudentId(),
                        r.getStudentCode(),
                        r.getStatus() != null ? r.getStatus().name().toLowerCase() : null,
                        r.getCreatedAt() != null ? r.getCreatedAt().toString() : null,
                        r.getExpiresAt() != null ? r.getExpiresAt().toString() : null
                ))
                .toList();

        return ResponseEntity.ok(ResponseDto.getSuccess(items));
    }

    /**
     * 7. Staff qarori: tasdiqlash.
     * POST /api/v1/face/verify-requests/{id}/approve
     */
    @PostMapping("/verify-requests/{id}/approve")
    public ResponseEntity<ResponseDto<Map<String, Object>>> approveVerifyRequest(
            @PathVariable String id,
            HttpServletRequest request) {

        JwtTokenDto jwtDto = (JwtTokenDto) request.getAttribute("jwtDto");
        var decided = verificationRequestService.decide(id, jwtDto != null ? jwtDto.id() : null, true);

        return ResponseEntity.ok(ResponseDto.getSuccess(Map.of(
                "id", decided.getId(),
                "status", decided.getStatus() != null ? decided.getStatus().name().toLowerCase() : "approved"
        )));
    }

    /**
     * 8. Staff qarori: rad etish.
     * POST /api/v1/face/verify-requests/{id}/deny
     */
    @PostMapping("/verify-requests/{id}/deny")
    public ResponseEntity<ResponseDto<Map<String, Object>>> denyVerifyRequest(
            @PathVariable String id,
            HttpServletRequest request) {

        JwtTokenDto jwtDto = (JwtTokenDto) request.getAttribute("jwtDto");
        var decided = verificationRequestService.decide(id, jwtDto != null ? jwtDto.id() : null, false);

        return ResponseEntity.ok(ResponseDto.getSuccess(Map.of(
                "id", decided.getId(),
                "status", decided.getStatus() != null ? decided.getStatus().name().toLowerCase() : "rejected"
        )));
    }

    /**
     * 9. Yuz huquqini bekor qilish (staff — istalganini, student — faqat o'ziniki).
     * DELETE /api/v1/face/{studentId}/revoke
     */
    @DeleteMapping("/{studentId}/revoke")
    public ResponseEntity<ResponseDto<Map<String, Object>>> revoke(
            @PathVariable String studentId,
            HttpServletRequest request) {

        JwtTokenDto jwtDto = (JwtTokenDto) request.getAttribute("jwtDto");
        if (jwtDto != null && "Student".equals(jwtDto.ownerType()) && !studentId.equals(jwtDto.id())) {
            throw new org.springframework.security.access.AccessDeniedException("You can only revoke your own face");
        }

        Map<String, Object> result = biometricService.revokeStudent(studentId, request.getRemoteAddr());
        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }

    /**
     * 10. So'nggi biometrik audit hodisalari (admin).
     * GET /api/v1/face/audit
     */
    @GetMapping("/audit")
    public ResponseEntity<ResponseDto<List<BiometricEventEntity>>> audit() {
        List<BiometricEventEntity> events = biometricService.recentEvents(200);
        return ResponseEntity.ok(ResponseDto.getSuccess(events));
    }
}
