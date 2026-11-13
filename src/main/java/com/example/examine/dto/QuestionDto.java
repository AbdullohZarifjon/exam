package com.example.examine.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * QuestionDto - Savollar moduliga tegishli barcha DTO larni o'z ichiga oluvchi interfeys.
 * Interface inside Record Pattern bo'yicha tuzilgan.
 */
public interface QuestionDto {

    /**
     * Yangi savol yaratish so'rovi uchun DTO (Request DTO).
     * QOIDA: 'options' ro'yxatining 0-indeksidagi element DOIMO to'g'ri javob hisoblanadi!
     */
    record CreateQuestionRequest(
            @NotBlank(message = "Imtihon ID si bo'sh bo'lishi mumkin emas")
            String examId,

            @NotBlank(message = "Savol matni bo'sh bo'lishi mumkin emas")
            @Size(max = 1000, message = "Savol matni maksimal 1000 ta belgidan iborat bo'lishi kerak")
            String text,

            @NotNull(message = "Variantlar ro'yxati bo'sh bo'lishi mumkin emas")
            @Size(min = 4, max = 4, message = "Savol aniq 4 ta variantga ega bo'lishi kerak")
            List<@NotBlank(message = "Variant matni bo'sh bo'lishi mumkin emas") String> options,
            // Eslatma: options.get(0) har doim to'g'ri javob matni bo'lib yoziladi!

            @Size(max = 500, message = "Izoh maksimal 500 ta belgidan iborat bo'lishi kerak")
            String explanation,

            String imageUrl,

            Boolean isActive
    ) {}

    /**
     * Savolni tahrirlash so'rovi uchun DTO (Update DTO).
     */
    record UpdateQuestionRequest(
            @Size(max = 1000, message = "Savol matni maksimal 1000 ta belgidan iborat bo'lishi kerak")
            String text,

            @Size(min = 4, max = 4, message = "Savol aniq 4 ta variantga ega bo'lishi kerak")
            List<@NotBlank(message = "Variant matni bo'sh bo'lishi mumkin emas") String> options,

            @Size(max = 500, message = "Izoh maksimal 500 ta belgidan iborat bo'lishi kerak")
            String explanation,

            String imageUrl,

            Boolean isActive
    ) {}

    /**
     * Klientga qaytariladigan savol ma'lumotlari DTO'si (Response DTO).
     */
    record QuestionResponse(
            String id,
            String examId,
            String text,
            List<String> options,
            String explanation,
            String imageUrl,
            Boolean isActive,
            String createdAt,
            String updatedAt
    ) {}
}