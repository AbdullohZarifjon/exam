package com.example.examine.service;

import com.example.examine.config.security.CookieService;
import com.example.examine.config.security.JwtService;
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
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.WebUtils;

import java.util.List;

/**
 * AuthService - Autentifikatsiya, tokenlar boshqaruvi, xodimlarni ro'yxatdan o'tkazish
 * va sessiya logikasini bajaruvchi asosiy servis (Controller'dan barcha logika olib kelindi).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final StudentMapper studentMapper;
    private final JwtService jwtService;
    private final CookieService cookieService;
    private final AttemptService attemptService;

    @Value("${jwt.access-token-validity:900}")
    private long accessValidity;

    @Value("${jwt.refresh-token-validity:2592000}")
    private long refreshValidity;

    /**
     * 1. Xodim (Admin/Teacher) tizimga kirishi (Login).
     */
    public AuthDto.AuthIdentityResponse login(AuthDto.LoginRequest request, HttpServletResponse response) {
        UserEntity user = getUserByUsername(request.username());

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new CustomBadRequestException(ResponseType.USER_INACTIVE);
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new CustomBadRequestException(ResponseType.INVALID_CREDENTIALS);
        }

        // Tokenlarni generatsiya qilamiz
        return getAuthIdentityResponse(response, user);
    }

    /**
     * 2. Refresh token orqali yangi Access token olish (Token Refresh).
     */
    public AuthDto.AuthIdentityResponse refreshToken(HttpServletRequest request, HttpServletResponse response) {
        var cookie = WebUtils.getCookie(request, "refresh-token");
        if (cookie == null) {
            throw new CustomBadRequestException(ResponseType.UNAUTHORIZED);
        }

        try {
            var jwtDto = jwtService.validate(cookie.getValue(), TokenType.REFRESH);

            if ("Student".equals(jwtDto.ownerType())) {
                StudentEntity student = studentRepository.findById(jwtDto.id())
                        .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));

                String accessToken = jwtService.generateAccess(student.getId(), null, null, "Student", jwtDto.examId(), student.getTokenVersion());
                cookieService.setAccess(response, accessToken, accessValidity);

                return new AuthDto.AuthIdentityResponse("Student", null, studentMapper.toPublicDto(student));
            }

            UserEntity user = userRepository.findById(jwtDto.id())
                    .orElseThrow(() -> new CustomBadRequestException(ResponseType.USER_NOT_FOUND));

            return getAuthIdentityResponse(response, user);

        } catch (Exception e) {
            throw new CustomBadRequestException(ResponseType.UNAUTHORIZED);
        }
    }

    private AuthDto.AuthIdentityResponse getAuthIdentityResponse(HttpServletResponse response, UserEntity user) {
        String accessToken = jwtService.generateAccess(user.getId(), user.getUsername(), user.getRole().name(), "User", null, user.getTokenVersion());
        String newRefresh = jwtService.generateRefresh(user.getId(), user.getUsername(), user.getRole().name(), "User", null, user.getTokenVersion());

        cookieService.setAccess(response, accessToken, accessValidity);
        cookieService.setRefresh(response, newRefresh, refreshValidity);

        return new AuthDto.AuthIdentityResponse("User", userMapper.toDto(user), null);
    }

    /**
     * 3. Tizimdan chiqish (Logout).
     */
    public void logout(HttpServletResponse response) {
        cookieService.clear(response);
    }

    /**
     * 4. Barcha qurilmalardan chiqish (Logout-all).
     */
    public void logoutAll(String currentUserId, String ownerType) {
        if ("User".equals(ownerType)) {
            UserEntity user = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new CustomBadRequestException(ResponseType.USER_NOT_FOUND));
            user.setTokenVersion(user.getTokenVersion() + 1);
            userRepository.save(user);
        }
    }

    /**
     * 5. Joriy foydalanuvchi ma'lumotlarini olish (Me).
     */
    public AuthDto.AuthIdentityResponse getCurrentUser(String currentId, String ownerType) {
        if (UserRoleType.ADMIN.name().equals(ownerType)) {
            StudentEntity student = studentRepository.findById(currentId)
                    .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));
            return new AuthDto.AuthIdentityResponse(UserRoleType.ADMIN.name(), null, studentMapper.toPublicDto(student));
        }

        UserEntity user = userRepository.findById(currentId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.USER_NOT_FOUND));
        return new AuthDto.AuthIdentityResponse("User", userMapper.toDto(user), null);
    }

    /**
     * 6. Xodimlar ro'yxatini olish.
     */
    @Transactional(readOnly = true)
    public List<AuthDto.PublicUserResponse> listStaff() {
        List<UserEntity> users = userRepository.findAll();
        return userMapper.toDtoList(users);
    }

    /**
     * 7. Yangi xodim qo'shish.
     */
    public AuthDto.PublicUserResponse createStaff(AuthDto.CreateStaffRequest request) {
        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new CustomBadRequestException(ResponseType.USERNAME_ALREADY_USED);
        }

        UserRoleType role;
        try {
            role = UserRoleType.valueOf(request.role());
        } catch (IllegalArgumentException e) {
            throw new CustomBadRequestException(ResponseType.BAD_REQUEST);
        }

        UserEntity newUser = UserEntity.builder()
                .fullName(request.fullName())
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .isActive(true)
                .tokenVersion(0)
                .build();

        UserEntity saved = userRepository.save(newUser);
        return userMapper.toDto(saved);
    }

    /**
     * 8. Parolni yangilash.
     */
    public AuthDto.PublicUserResponse resetPassword(String id, AuthDto.ResetPasswordRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.USER_NOT_FOUND));

        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setTokenVersion(user.getTokenVersion() + 1);

        UserEntity saved = userRepository.save(user);
        return userMapper.toDto(saved);
    }

    private UserEntity getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.INVALID_CREDENTIALS));
    }
}