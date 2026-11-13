package com.example.examine.controller;

import com.example.examine.config.security.JwtTokenDto;
import com.example.examine.constant.ResponseType;
import com.example.examine.dto.AuthDto;
import com.example.examine.dto.ResponseDto;
import com.example.examine.dto.ResultDtoExport;
import com.example.examine.dto.attempt.FinishRequestDto;
import com.example.examine.dto.upload.OkDto;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.service.AttemptService;
import com.example.examine.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AuthController - Autentifikatsiya va sessiyalarni boshqaruvchi REST API controller.
 * DIQQAT: Bu yerda hech qanday biznes-logika mavjud emas, barchasi AuthService'ga yuklangan.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AttemptService attemptService;

    /**
     * Xodimlar (Admin/Teacher) tizimga kirishi.
     * POST /api/v1/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<ResponseDto<AuthDto.AuthIdentityResponse>> login(
            @Valid @RequestBody AuthDto.LoginRequest dto,
            HttpServletResponse response) {
        AuthDto.AuthIdentityResponse result = authService.login(dto, response);
        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }

    /**
     * Refresh token orqali yangi Access token olish.
     * POST /api/v1/auth/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<ResponseDto<AuthDto.AuthIdentityResponse>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        AuthDto.AuthIdentityResponse result = authService.refreshToken(request, response);
        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }

    /**
     * Tizimdan chiqish (Logout).
     * POST /api/v1/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<ResponseDto<OkDto>> logout(HttpServletResponse response) {
        authService.logout(response);
        return ResponseEntity.ok(ResponseDto.getSuccess(new OkDto(true)));
    }

    /**
     * Barcha qurilmalardan chiqish (Logout-all).
     * POST /api/v1/auth/logout-all
     */
    @PostMapping("/logout-all")
    public ResponseEntity<ResponseDto<OkDto>> logoutAll(HttpServletRequest request) {
        JwtTokenDto jwtDto = (JwtTokenDto) request.getAttribute("jwtDto");
        if (jwtDto != null) {
            authService.logoutAll(jwtDto.id(), jwtDto.ownerType());
        }
        return ResponseEntity.ok(ResponseDto.getSuccess(new OkDto(true)));
    }

    /**
     * Joriy foydalanuvchi ma'lumotlarini olish (Who am I).
     * GET /api/v1/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<ResponseDto<AuthDto.AuthIdentityResponse>> me(HttpServletRequest request) {
        JwtTokenDto jwtDto = (JwtTokenDto) request.getAttribute("jwtDto");
        if (jwtDto == null) {
            throw new CustomBadRequestException(ResponseType.UNAUTHORIZED);
        }
        AuthDto.AuthIdentityResponse result = authService.getCurrentUser(jwtDto.id(), jwtDto.ownerType());
        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }

    /**
     * Xodimlar ro'yxatini olish (Admin).
     * GET /api/v1/auth/admin/users
     */
    @GetMapping("/admin/users")
    public ResponseEntity<ResponseDto<List<AuthDto.PublicUserResponse>>> listStaff() {
        List<AuthDto.PublicUserResponse> result = authService.listStaff();
        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }

    /**
     * Yangi xodim qo'shish (Admin).
     * POST /api/v1/auth/admin/users
     */
    @PostMapping("/admin/users")
    public ResponseEntity<ResponseDto<AuthDto.PublicUserResponse>> createStaff(
            @Valid @RequestBody AuthDto.CreateStaffRequest dto) {
        AuthDto.PublicUserResponse result = authService.createStaff(dto);
        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }

    /**
     * Xodim parolini tiklash (Admin).
     * POST /api/v1/auth/admin/users/{id}/reset-password
     */
    @PostMapping("/admin/users/{id}/reset-password")
    public ResponseEntity<ResponseDto<AuthDto.PublicUserResponse>> resetPassword(
            @PathVariable String id,
            @Valid @RequestBody AuthDto.ResetPasswordRequest dto) {
        AuthDto.PublicUserResponse result = authService.resetPassword(id, dto);
        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }

    /**
     * Talaba imtihonni yakunlashi (Finish exam).
     * POST /api/v1/auth/student/finish
     */
    @PostMapping("/student/finish")
    public ResponseEntity<ResponseDto<Object>> finishExam(
            @Valid @RequestBody FinishRequestDto dto,
            HttpServletRequest request,
            HttpServletResponse response) {
        JwtTokenDto jwtDto = (JwtTokenDto) request.getAttribute("jwtDto");
        String studentId = jwtDto != null ? jwtDto.id() : null;

        var attemptResult = attemptService.finishExam(dto.attemptId(), studentId);
        authService.logout(response); // Tugatgandan keyin cookie to tozalanadi

        return ResponseEntity.ok(ResponseDto.getSuccess(Map.of("attempt", attemptResult)));
    }

    /**
     * Talabaning imtihon natijasini token orqali olish.
     * GET /api/v1/auth/student/result/{token}
     */
    @GetMapping("/student/result/{token}")
    public ResponseEntity<ResponseDto<ResultDtoExport.ResultDto>> getResultByToken(@PathVariable String token) {
        ResultDtoExport.ResultDto result = attemptService.resultByToken(token);
        return ResponseEntity.ok(ResponseDto.getSuccess(result));
    }
}