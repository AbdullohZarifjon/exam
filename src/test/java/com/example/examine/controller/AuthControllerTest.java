package com.example.examine.controller;

import com.example.examine.config.security.JwtTokenDto;
import com.example.examine.dto.AttemptDto;
import com.example.examine.dto.AuthDto;
import com.example.examine.dto.ResultDtoExport;
import com.example.examine.exception.GlobalExceptionHandler;
import com.example.examine.service.AttemptService;
import com.example.examine.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock private AuthService authService;
    @Mock private AttemptService attemptService;

    @InjectMocks
    private AuthController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private AuthDto.AuthIdentityResponse identity() {
        return new AuthDto.AuthIdentityResponse("User",
                new AuthDto.PublicUserResponse("user-1", "Admin", "admin", "ADMIN", true, null), null);
    }

    private AttemptDto.AttemptResponse attempt() {
        return new AttemptDto.AttemptResponse("attempt-1", "exam-1", "student-1", "in_progress",
                60, null, null, null, 0, 0, 0, 0, 0, null, List.of());
    }

    @Test
    void login_returnsSuccess() throws Exception {
        when(authService.login(any(AuthDto.LoginRequest.class), any())).thenReturn(identity());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"pass\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.payload.ownerType").value("User"));
    }

    @Test
    void refresh_returnsSuccess() throws Exception {
        when(authService.refreshToken(any(), any())).thenReturn(identity());

        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.ownerType").value("User"));
    }

    @Test
    void logout_returnsOk() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.ok").value(true));
    }

    @Test
    void logoutAll_withJwt_returnsOk() throws Exception {
        JwtTokenDto jwtDto = new JwtTokenDto("user-1", "admin", "ADMIN", "User", null, 0);

        mockMvc.perform(post("/api/v1/auth/logout-all").requestAttr("jwtDto", jwtDto))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.ok").value(true));
    }

    @Test
    void me_withJwt_returnsIdentity() throws Exception {
        JwtTokenDto jwtDto = new JwtTokenDto("user-1", "admin", "ADMIN", "User", null, 0);
        when(authService.getCurrentUser("user-1", "User")).thenReturn(identity());

        mockMvc.perform(get("/api/v1/auth/me").requestAttr("jwtDto", jwtDto))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.ownerType").value("User"));
    }

    @Test
    void me_withoutJwt_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(8));
    }

    @Test
    void listStaff_returnsList() throws Exception {
        when(authService.listStaff()).thenReturn(List.of(
                new AuthDto.PublicUserResponse("user-1", "Admin", "admin", "ADMIN", true, null)));

        mockMvc.perform(get("/api/v1/auth/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload[0].username").value("admin"));
    }

    @Test
    void createStaff_returnsCreatedUser() throws Exception {
        when(authService.createStaff(any(AuthDto.CreateStaffRequest.class))).thenReturn(
                new AuthDto.PublicUserResponse("user-2", "Teacher", "teacher", "TEACHER", true, null));

        mockMvc.perform(post("/api/v1/auth/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Teacher\",\"username\":\"teacher\",\"password\":\"secret\",\"role\":\"TEACHER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.username").value("teacher"));
    }

    @Test
    void resetPassword_returnsUpdatedUser() throws Exception {
        when(authService.resetPassword(eq("user-1"), any(AuthDto.ResetPasswordRequest.class))).thenReturn(
                new AuthDto.PublicUserResponse("user-1", "Admin", "admin", "ADMIN", true, null));

        mockMvc.perform(post("/api/v1/auth/admin/users/user-1/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"newpass\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.id").value("user-1"));
    }

    @Test
    void finishExam_returnsAttempt() throws Exception {
        when(attemptService.finishExam(eq("attempt-1"), any())).thenReturn(attempt());

        mockMvc.perform(post("/api/v1/auth/student/finish")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"attemptId\":\"attempt-1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.attempt.id").value("attempt-1"));
    }

    @Test
    void getResultByToken_returnsResult() throws Exception {
        when(attemptService.resultByToken("token")).thenReturn(new ResultDtoExport.ResultDto(
                "attempt-1", "exam-1", "student-1", "submitted", 1, 1, 1, 1, 100, null, List.of()));

        mockMvc.perform(get("/api/v1/auth/student/result/token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.attemptId").value("attempt-1"));
    }
}
