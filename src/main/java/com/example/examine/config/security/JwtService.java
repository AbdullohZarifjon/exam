package com.example.examine.config.security;

import com.example.examine.constant.TokenType;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;

/**
 * JwtService - JWT Access va Refresh tokenlarni generatsiya qilish,
 * ularning imzosi va amal qilish muddatini tekshirish (validatsiya) xizmati.
 */
@Service
public class JwtService {

    private final SecretKeyProvider secretKeyProvider;
    private final long accessValidity;
    private final long refreshValidity;

    public JwtService(
            SecretKeyProvider secretKeyProvider,
            @Value("${jwt.access-token-validity:900}") long accessValidity,
            @Value("${jwt.refresh-token-validity:2592000}") long refreshValidity) {
        this.secretKeyProvider = secretKeyProvider;
        this.accessValidity = accessValidity;
        this.refreshValidity = refreshValidity;
    }

    /**
     * Access token generatsiya qilish.
     */
    public String generateAccess(String id, String username, String role, String ownerType, String examId, Integer tokenVersion) {
        return buildToken(id, username, role, ownerType, examId, tokenVersion, TokenType.ACCESS, accessValidity);
    }

    /**
     * Refresh token generatsiya qilish.
     */
    public String generateRefresh(String id, String username, String role, String ownerType, String examId, Integer tokenVersion) {
        return buildToken(id, username, role, ownerType, examId, tokenVersion, TokenType.REFRESH, refreshValidity);
    }

    /**
     * Tokenni yig'uvchi yordamchi private metod (var ishlatilmagan).
     */
    private String buildToken(String id, String username, String role, String ownerType, String examId, Integer tokenVersion, TokenType type, long validitySeconds) {
        Date now = new Date();
        Date expirationDate = new Date(now.getTime() + validitySeconds * 1000L);

        return Jwts.builder()
                .subject(id)
                .claim("id", id)
                .claim("username", username)
                .claim("role", role)
                .claim("ownerType", ownerType)
                .claim("examId", examId)
                .claim("tv", tokenVersion)
                .claim("type", type.name())
                .issuedAt(now)
                .expiration(expirationDate)
                .signWith(secretKeyProvider.getKey())
                .compact();
    }

    /**
     * Tokenni tekshirish va uning ichidagi ma'lumotlarni (Claims) o'qib olish.
     */
    public JwtTokenDto validate(String token, TokenType expectedType) {
        Claims claims = Jwts.parser()
                .verifyWith(secretKeyProvider.getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String tokenType = claims.get("type", String.class);
        if (!expectedType.name().equals(tokenType)) {
            throw new JwtException("Token turi noto'g'ri");
        }

        String id = claims.get("id", String.class);
        if (id == null) {
            id = claims.getSubject();
        }

        return new JwtTokenDto(
                id,
                claims.get("username", String.class),
                claims.get("role", String.class),
                claims.get("ownerType", String.class),
                claims.get("examId", String.class),
                claims.get("tv", Integer.class)
        );
    }

    /**
     * Tokenning yaroqli ekanligini boolean qiymatda qaytarish.
     */
    public boolean isValid(String token, TokenType type) {
        try {
            validate(token, type);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}