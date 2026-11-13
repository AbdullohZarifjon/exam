package com.example.examine.config.security;

import com.example.examine.constant.TokenType;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private final SecretKeyProvider secretKeyProvider =
            new SecretKeyProvider("01234567890123456789012345678901");
    private final JwtService jwtService = new JwtService(secretKeyProvider, 900, 2592000);

    @Test
    void generateAccess_andValidate_roundTripsClaims() {
        String token = jwtService.generateAccess("id-1", "admin", "ADMIN", "User", "exam-1", 3);

        JwtTokenDto dto = jwtService.validate(token, TokenType.ACCESS);

        assertThat(dto.id()).isEqualTo("id-1");
        assertThat(dto.username()).isEqualTo("admin");
        assertThat(dto.roleName()).isEqualTo("ADMIN");
        assertThat(dto.ownerType()).isEqualTo("User");
        assertThat(dto.examId()).isEqualTo("exam-1");
        assertThat(dto.tokenVersion()).isEqualTo(3);
    }

    @Test
    void generateRefresh_andValidate_roundTripsClaims() {
        String token = jwtService.generateRefresh("student-1", null, null, "Student", "exam-2", 0);

        JwtTokenDto dto = jwtService.validate(token, TokenType.REFRESH);

        assertThat(dto.id()).isEqualTo("student-1");
        assertThat(dto.ownerType()).isEqualTo("Student");
        assertThat(dto.examId()).isEqualTo("exam-2");
        assertThat(dto.tokenVersion()).isZero();
    }

    @Test
    void validate_withWrongTokenType_throws() {
        String accessToken = jwtService.generateAccess("id", "u", "ADMIN", "User", null, 0);

        assertThatThrownBy(() -> jwtService.validate(accessToken, TokenType.REFRESH))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void validate_withMalformedToken_throws() {
        assertThatThrownBy(() -> jwtService.validate("not-a-token", TokenType.ACCESS))
                .isInstanceOf(Exception.class);
    }

    @Test
    void isValid_returnsTrueForMatchingType() {
        String token = jwtService.generateAccess("id", "u", "ADMIN", "User", null, 0);

        assertThat(jwtService.isValid(token, TokenType.ACCESS)).isTrue();
        assertThat(jwtService.isValid(token, TokenType.REFRESH)).isFalse();
        assertThat(jwtService.isValid("garbage", TokenType.ACCESS)).isFalse();
    }
}
