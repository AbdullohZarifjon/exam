package com.example.examine.dto;

import com.example.examine.constant.ExamStatus;
import jakarta.validation.constraints.*;

/**
 * ExamDto - Imtihon moduliga tegishli barcha DTO larni birlashtiruvchi interfeys.
 * Interface inside Record Pattern: Kodni guruhlash va tartibli saqlash uchun ishlatiladi.
 */
public interface ExamDto {

    /**
     * Yangi imtihon yaratish so'rovi (Request DTO).
     */
    record CreateExamRequest(
            @NotBlank(message = "Imtihon nomi (title) bo'sh bo'lishi mumkin emas")
            @Size(max = 100, message = "Imtihon nomi maksimal 100 ta belgidan iborat bo'lishi kerak")
            String title,

            @Size(max = 500, message = "Imtihon tavsifi (description) maksimal 500 ta belgidan iborat bo'lishi kerak")
            String description,

            @NotNull(message = "Imtihon davomiyligi (timerMinutes) kiritilishi shart")
            @Min(value = 5, message = "Imtihon vaqti kamida 5 daqiqa bo'lishi kerak")
            @Max(value = 300, message = "Imtihon vaqti ko'pi bilan 300 daqiqa (5 soat) bo'lishi mumkin")
            Integer timerMinutes,

            @NotNull(message = "Talabaga beriladigan savollar soni (questionsToServe) kiritilishi shart")
            @Min(value = 1, message = "Kamida 1 ta savol berilishi kerak")
            @Max(value = 500, message = "Maksimal 500 ta savol berilishi mumkin")
            Integer questionsToServe,

            @Min(value = 0, message = "O'tish foizi 0 dan kam bo'lishi mumkin emas")
            @Max(value = 100, message = "O'tish foizi 100 foizdan oshishi mumkin emas")
            Integer passingScorePercent,

            @Min(value = 0, message = "O'tish balli 0 dan kam bo'lishi mumkin emas")
            Integer passingScorePoints
    ) {}

    /**
     * Mavjud imtihonni tahrirlash so'rovi (Update DTO).
     */
    record UpdateExamRequest(
            @Size(max = 100, message = "Imtihon nomi maksimal 100 ta belgidan iborat bo'lishi kerak")
            String title,

            @Size(max = 500, message = "Imtihon tavsifi maksimal 500 ta belgidan iborat bo'lishi kerak")
            String description,

            @Min(value = 5, message = "Imtihon vaqti kamida 5 daqiqa bo'lishi kerak")
            @Max(value = 300, message = "Imtihon vaqti ko'pi bilan 300 daqiqa bo'lishi mumkin")
            Integer timerMinutes,

            @Min(value = 1, message = "Kamida 1 ta savol berilishi kerak")
            @Max(value = 500, message = "Maksimal 500 ta savol berilishi mumkin")
            Integer questionsToServe,

            @Min(value = 0, message = "O'tish foizi 0 dan kam bo'lishi mumkin emas")
            @Max(value = 100, message = "O'tish foizi 100 foizdan oshishi mumkin emas")
            Integer passingScorePercent,

            @Min(value = 0, message = "O'tish balli 0 dan kam bo'lishi mumkin emas")
            Integer passingScorePoints
    ) {}

    /**
     * Client ga javob sifatida qaytariladigan DTO (Response DTO).
     */
    record ExamResponse(
            String id,
            String title,
            String description,
            ExamStatus status,
            Integer timerMinutes,
            Integer questionsToServe,
            Integer passingScorePercent,
            Integer passingScorePoints,
            String createdBy,
            String createdAt,
            String updatedAt
    ) {}
}