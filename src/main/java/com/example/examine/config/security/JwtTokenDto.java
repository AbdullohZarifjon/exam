package com.example.examine.config.security;

/**
 * JwtTokenDto - JWT token ichiga yashiringan (Payload) foydalanuvchi ma'lumotlarini
 * dastur bo'ylab xavfsiz va qulay tashiydigan record.
 */
public record JwtTokenDto(
        String id,
        String username,
        String roleName,
        String ownerType, // "User" (Admin/Teacher) yoki "Student"
        String examId,
        Integer tokenVersion
) {}