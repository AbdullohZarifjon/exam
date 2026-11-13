package com.example.examine.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * StudentDto - Talabalar moduliga tegishli barcha so'rov (Request) va
 * javob (Response) DTO larni o'z ichiga oluvchi interfeys (Interface inside Record Pattern).
 */
public interface StudentDto {

    /**
     * Yangi talaba yaratish so'rovi uchun DTO.
     */
    record CreateStudentRequest(
            @NotBlank(message = "Talabaning F.I.O. bo'sh bo'lishi mumkin emas")
            @Size(max = 100, message = "F.I.O. maksimal 100 ta belgidan oshmasligi kerak")
            String fullName,

            // Agar studentCode kiritilmasa, tizim avtomatik generatsiya qiladi
            String studentCode
    ) {}

    /**
     * Talaba ma'lumotlarini tahrirlash so'rovi uchun DTO.
     */
    record UpdateStudentRequest(
            @Size(max = 100, message = "F.I.O. maksimal 100 ta belgidan oshmasligi kerak")
            String fullName,

            String studentCode
    ) {}

    /**
     * Talabaning umumiy ma'lumotlarini qaytarish uchun DTO (Response).
     */
    record StudentResponse(
            String id,
            String fullName,
            String studentCode,
            Boolean isActive,
            String faceStatus,
            String createdAt,
            String updatedAt
    ) {}

    /**
     * Talabaning faqat ommaviy (public) ma'lumotlarini qaytarish uchun DTO (Masalan, Face ID identifikatsiyadan keyin).
     */
    record PublicStudentResponse(
            String id,
            String fullName,
            String studentCode,
            String faceStatus
    ) {}

    /**
     * Sahifalangan (Pagination) talabalar ro'yxati uchun Response DTO.
     */
    record StudentListResponse(
            List<StudentResponse> items,
            long totalElements,
            int page,
            int limit,
            int totalPages
    ) {}
}