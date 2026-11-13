package com.example.examine.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * AuthDto - Autentifikatsiya va foydalanuvchilarni boshqarish bilan bog'liq
 * barcha DTO larni o'z ichiga oluvchi interfeys (Interface inside Record Pattern).
 */
public interface AuthDto {

    /**
     * Tizimga kirish (Login) so'rovi uchun DTO.
     */
    record LoginRequest(
            @NotBlank(message = "Username bo'sh bo'lishi mumkin emas")
            String username,

            @NotBlank(message = "Parol bo'sh bo'lishi mumkin emas")
            String password
    ) {}

    /**
     * Yangi xodim (Staff) yaratish so'rovi uchun DTO.
     */
    record CreateStaffRequest(
            @NotBlank(message = "F.I.O. bo'sh bo'lishi mumkin emas")
            @Size(max = 100, message = "F.I.O. 100 ta belgidan oshmasligi kerak")
            String fullName,

            @NotBlank(message = "Username bo'sh bo'lishi mumkin emas")
            @Size(min = 3, max = 50, message = "Username 3 va 50 belgi oralig'ida bo'lishi kerak")
            String username,

            @NotBlank(message = "Parol bo'sh bo'lishi mumkin emas")
            @Size(min = 6, max = 50, message = "Parol uzunligi kamida 6 ta belgi bo'lishi kerak")
            String password,

            @NotBlank(message = "Rol (role) ko'rsatilishi shart")
            String role
    ) {}

    /**
     * Parolni tiklash so'rovi uchun DTO.
     */
    record ResetPasswordRequest(
            @NotBlank(message = "Yangi parol bo'sh bo'lishi mumkin emas")
            @Size(min = 6, max = 50, message = "Parol uzunligi kamida 6 ta belgi bo'lishi kerak")
            String password
    ) {}

    /**
     * Xodimning ommaviy ma'lumotlarini qaytarish uchun DTO (Response).
     */
    record PublicUserResponse(
            String id,
            String fullName,
            String username,
            String role,
            Boolean isActive,
            String createdAt
    ) {}

    /**
     * Autentifikatsiya qilingan foydalanuvchi yoki talaba haqida ma'lumot DTO'si.
     */
    record AuthIdentityResponse(
            String ownerType, // "User" yoki "Student"
            PublicUserResponse user,
            Object student // Talaba uchun umumiy obyekt
    ) {}
}
