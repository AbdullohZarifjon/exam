package com.example.examine.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * FaceAuthDto - Face ID orqali autentifikatsiya qilish va imtihonga kirish
 * so'rovlari va javoblarini qamrab oluvchi interfeys (Interface inside Record Pattern).
 */
public interface FaceAuthDto {

    /**
     * Yuz orqali imtihonni boshlash so'rovi DTO'si.
     */
    record FaceIdentifyRequest(
            @NotBlank(message = "Imtihon ID si bo'sh bo'lishi mumkin emas")
            String examId,

            @NotBlank(message = "Rasm ma'lumoti (imageBase64) bo'sh bo'lishi mumkin emas")
            String imageBase64
    ) {}

    /**
     * Yuz orqali muvaffaqiyatli kirilganda klientga qaytariladigan asosiy javob DTO'si.
     */
    record FaceIdentifyResponse(
            String ownerType,
            StudentDto.PublicStudentResponse student,
            ExamDto.ExamResponse exam,
            AttemptDto.AttemptResponse attempt,
            AssuranceDto assurance
    ) {}

    /**
     * Biometrik ishonchlilik (Assurance) ko'rsatkichlari DTO'si.
     */
    record AssuranceDto(
            double score,
            double gap,
            String model
    ) {}
}