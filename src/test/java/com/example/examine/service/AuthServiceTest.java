package com.example.examine.service;

import com.example.examine.config.security.CookieService;
import com.example.examine.config.security.JwtService;
import com.example.examine.config.security.JwtTokenDto;
import com.example.examine.constant.ResponseType;
import com.example.examine.constant.TokenType;
import com.example.examine.constant.UserRoleType;
import com.example.examine.dto.AuthDto;
import com.example.examine.entity.StudentEntity;
import com.example.examine.entity.UserEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.StudentMapper;
import com.example.examine.mapper.UserMapper;
import com.example.examine.repository.StudentRepository;
import com.example.examine.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.servlet.http.Cookie;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private UserMapper userMapper;
    @Mock private StudentMapper studentMapper;
    @Mock private JwtService jwtService;
    @Mock private CookieService cookieService;
    @Mock private AttemptService attemptService;

    @InjectMocks
    private AuthService authService;

    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "accessValidity", 900L);
        ReflectionTestUtils.setField(authService, "refreshValidity", 2592000L);
        response = new MockHttpServletResponse();
    }

    private UserEntity user() {
        return UserEntity.builder()
                .id("user-1")
                .username("admin")
                .passwordHash("hash")
                .role(UserRoleType.ADMIN)
                .isActive(true)
                .tokenVersion(0)
                .build();
    }

    @Test
    void login_success_returnsUserIdentityAndSetsCookies() {
        UserEntity user = user();
        AuthDto.PublicUserResponse publicUser = new AuthDto.PublicUserResponse(
                "user-1", "Admin", "admin", "ADMIN", true, null);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pass", "hash")).thenReturn(true);
        when(jwtService.generateAccess("user-1", "admin", "ADMIN", "User", null, 0)).thenReturn("access");
        when(jwtService.generateRefresh("user-1", "admin", "ADMIN", "User", null, 0)).thenReturn("refresh");
        when(userMapper.toDto(user)).thenReturn(publicUser);

        AuthDto.AuthIdentityResponse result = authService.login(
                new AuthDto.LoginRequest("admin", "pass"), response);

        assertThat(result.ownerType()).isEqualTo("User");
        assertThat(result.user()).isEqualTo(publicUser);
        assertThat(result.student()).isNull();
        verify(cookieService).setAccess(response, "access", 900L);
        verify(cookieService).setRefresh(response, "refresh", 2592000L);
    }

    @Test
    void login_unknownUser_throwsInvalidCredentials() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new AuthDto.LoginRequest("ghost", "pass"), response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.INVALID_CREDENTIALS.getMessageFormat());
    }

    @Test
    void login_inactiveUser_throwsUserInactive() {
        UserEntity user = user();
        user.setIsActive(false);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new AuthDto.LoginRequest("admin", "pass"), response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.USER_INACTIVE.getMessageFormat());
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentials() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user()));
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new AuthDto.LoginRequest("admin", "wrong"), response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.INVALID_CREDENTIALS.getMessageFormat());
    }

    @Test
    void refreshToken_withoutCookie_throwsUnauthorized() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThatThrownBy(() -> authService.refreshToken(request, response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.UNAUTHORIZED.getMessageFormat());
    }

    @Test
    void refreshToken_forStudent_returnsStudentIdentity() {
        StudentEntity student = StudentEntity.builder().id("student-1").tokenVersion(0).build();
        JwtTokenDto jwtDto = new JwtTokenDto("student-1", null, null, "Student", "exam-1", 0);
        when(jwtService.validate("refresh-value", TokenType.REFRESH)).thenReturn(jwtDto);
        when(studentRepository.findById("student-1")).thenReturn(Optional.of(student));
        when(jwtService.generateAccess("student-1", null, null, "Student", "exam-1", 0)).thenReturn("new-access");
        when(studentMapper.toPublicDto(student)).thenReturn(
                new com.example.examine.dto.StudentDto.PublicStudentResponse("student-1", "Ali", "STU-1", "ENROLLED"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refresh-token", "refresh-value"));

        AuthDto.AuthIdentityResponse result = authService.refreshToken(request, response);

        assertThat(result.ownerType()).isEqualTo("Student");
        assertThat(result.student()).isNotNull();
        verify(cookieService).setAccess(response, "new-access", 900L);
    }

    @Test
    void refreshToken_forUser_returnsUserIdentity() {
        UserEntity user = user();
        JwtTokenDto jwtDto = new JwtTokenDto("user-1", "admin", "ADMIN", "User", null, 0);
        when(jwtService.validate("refresh-value", TokenType.REFRESH)).thenReturn(jwtDto);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(jwtService.generateAccess("user-1", "admin", "ADMIN", "User", null, 0)).thenReturn("access");
        when(jwtService.generateRefresh("user-1", "admin", "ADMIN", "User", null, 0)).thenReturn("refresh");
        when(userMapper.toDto(user)).thenReturn(
                new AuthDto.PublicUserResponse("user-1", "Admin", "admin", "ADMIN", true, null));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refresh-token", "refresh-value"));

        AuthDto.AuthIdentityResponse result = authService.refreshToken(request, response);

        assertThat(result.ownerType()).isEqualTo("User");
        assertThat(result.user()).isNotNull();
    }

    @Test
    void refreshToken_invalidToken_throwsUnauthorized() {
        when(jwtService.validate("bad", TokenType.REFRESH)).thenThrow(new RuntimeException("bad"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refresh-token", "bad"));

        assertThatThrownBy(() -> authService.refreshToken(request, response))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.UNAUTHORIZED.getMessageFormat());
    }

    @Test
    void logout_clearsCookies() {
        authService.logout(response);

        verify(cookieService).clear(response);
    }

    @Test
    void logoutAll_forUser_incrementsTokenVersion() {
        UserEntity user = user();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        authService.logoutAll("user-1", "User");

        assertThat(user.getTokenVersion()).isEqualTo(1);
        verify(userRepository).save(user);
    }

    @Test
    void logoutAll_forStudent_doesNothing() {
        authService.logoutAll("student-1", "Student");

        verify(userRepository, never()).findById(anyString());
    }

    @Test
    void logoutAll_unknownUser_throws() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.logoutAll("missing", "User"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.USER_NOT_FOUND.getMessageFormat());
    }

    @Test
    void getCurrentUser_forAdminOwnerType_returnsStudent() {
        StudentEntity student = StudentEntity.builder().id("student-1").build();
        when(studentRepository.findById("student-1")).thenReturn(Optional.of(student));
        when(studentMapper.toPublicDto(student)).thenReturn(
                new com.example.examine.dto.StudentDto.PublicStudentResponse("student-1", "Ali", "STU-1", "ENROLLED"));

        AuthDto.AuthIdentityResponse result = authService.getCurrentUser("student-1", "ADMIN");

        assertThat(result.ownerType()).isEqualTo("ADMIN");
        assertThat(result.student()).isNotNull();
    }

    @Test
    void getCurrentUser_forUser_returnsUser() {
        UserEntity user = user();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(userMapper.toDto(user)).thenReturn(
                new AuthDto.PublicUserResponse("user-1", "Admin", "admin", "ADMIN", true, null));

        AuthDto.AuthIdentityResponse result = authService.getCurrentUser("user-1", "User");

        assertThat(result.ownerType()).isEqualTo("User");
        assertThat(result.user()).isNotNull();
    }

    @Test
    void getCurrentUser_unknownUser_throws() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getCurrentUser("missing", "User"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.USER_NOT_FOUND.getMessageFormat());
    }

    @Test
    void listStaff_returnsMappedUsers() {
        List<UserEntity> users = List.of(user());
        List<AuthDto.PublicUserResponse> mapped = List.of(
                new AuthDto.PublicUserResponse("user-1", "Admin", "admin", "ADMIN", true, null));
        when(userRepository.findAll()).thenReturn(users);
        when(userMapper.toDtoList(users)).thenReturn(mapped);

        List<AuthDto.PublicUserResponse> result = authService.listStaff();

        assertThat(result).isEqualTo(mapped);
    }

    @Test
    void createStaff_success_savesEncodedUser() {
        AuthDto.CreateStaffRequest request = new AuthDto.CreateStaffRequest(
                "New Teacher", "teacher", "secret", "TEACHER");
        UserEntity saved = UserEntity.builder()
                .id("user-2").fullName("New Teacher").username("teacher")
                .passwordHash("encoded").role(UserRoleType.TEACHER).isActive(true).tokenVersion(0).build();
        AuthDto.PublicUserResponse mapped = new AuthDto.PublicUserResponse(
                "user-2", "New Teacher", "teacher", "TEACHER", true, null);
        when(userRepository.findByUsername("teacher")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret")).thenReturn("encoded");
        when(userRepository.save(any(UserEntity.class))).thenReturn(saved);
        when(userMapper.toDto(saved)).thenReturn(mapped);

        AuthDto.PublicUserResponse result = authService.createStaff(request);

        assertThat(result).isEqualTo(mapped);
        verify(userRepository).save(any(UserEntity.class));
    }

    @Test
    void createStaff_duplicateUsername_throws() {
        when(userRepository.findByUsername("teacher"))
                .thenReturn(Optional.of(UserEntity.builder().username("teacher").build()));

        assertThatThrownBy(() -> authService.createStaff(
                new AuthDto.CreateStaffRequest("N", "teacher", "secret", "TEACHER")))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.USERNAME_ALREADY_USED.getMessageFormat());
    }

    @Test
    void createStaff_invalidRole_throwsBadRequest() {
        when(userRepository.findByUsername("teacher")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.createStaff(
                new AuthDto.CreateStaffRequest("N", "teacher", "secret", "SUPERADMIN")))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.BAD_REQUEST.getMessageFormat());
    }

    @Test
    void resetPassword_success_incrementsTokenVersion() {
        UserEntity user = user();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newpass")).thenReturn("newhash");
        when(userRepository.save(user)).thenReturn(user);
        when(userMapper.toDto(user)).thenReturn(
                new AuthDto.PublicUserResponse("user-1", "Admin", "admin", "ADMIN", true, null));

        authService.resetPassword("user-1", new AuthDto.ResetPasswordRequest("newpass"));

        assertThat(user.getPasswordHash()).isEqualTo("newhash");
        assertThat(user.getTokenVersion()).isEqualTo(1);
    }

    @Test
    void resetPassword_unknownUser_throws() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword("missing", new AuthDto.ResetPasswordRequest("newpass")))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.USER_NOT_FOUND.getMessageFormat());
    }
}
