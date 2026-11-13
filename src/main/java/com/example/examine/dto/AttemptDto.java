package com.example.examine.dto;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public interface AttemptDto {

    /**
     * Talabaning savolga javob yuborish so'rovi DTO'si.
     */
    record SubmitAnswerRequest(
            @NotBlank(message = "Savol ID si bo'sh bo'lishi mumkin emas")
            String questionId,

            @NotNull(message = "Javob indeksi ko'rsatilishi shart")
            @Min(value = 0, message = "Javob indeksi 0 dan kichik bo'lishi mumkin emas")
            @Max(value = 3, message = "Javob indeksi 3 dan katta bo'lishi mumkin emas (chunki variantlar 4 ta)")
            Integer answerIndex
    ) {}

    /**
     * Imtihon jarayoni va savollar holatini talabaga qaytarish uchun DTO.
     * (Eslatma: correctIndex bu yerda yashirin bo'ladi, talaba uni ko'ra olmaydi!)
     */
    record AttemptResponse(
            String id,
            String examId,
            String studentId,
            String status,
            Integer durationMinutes,
            String startedAt,
            String expiresAt,
            String submittedAt,
            Integer totalQuestions,
            Integer totalCorrect,
            Integer score,
            Integer maxScore,
            Integer scorePercent,
            String resultToken,
            List<AttemptQuestionDto> questions
    ) {
        public record AttemptQuestionDto(
                String questionId,
                String text,
                List<String> options, // Aralashtirilgan variantlar
                Integer answerIndex,  // Talaba tanlagan javob indeksi
                Boolean isCorrect     // Natija chiqgandan keyin ma'lum bo'ladi
        ) {}
    }
}
