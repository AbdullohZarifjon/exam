package com.example.examine.dto;

import java.util.List;

public interface ResultDtoExport {

    /**
     * Talabaning yakuniy natijasini va savollar tahlilini ko'rsatish uchun DTO.
     */
    record ResultDto(
            String attemptId,
            String examId,
            String studentId,
            String status,
            Integer totalQuestions,
            Integer totalCorrect,
            Integer score,
            Integer maxScore,
            Integer scorePercent,
            String submittedAt,
            List<ResultQuestionDto> questions
    ) {}

    record ResultQuestionDto(
            String questionId,
            String text,
            List<String> options,
            Integer correctIndex,   // Natija chiqqandan keyin to'g'ri javob ko'rsatiladi
            Integer answerIndex,    // Talaba belgilagan javob
            Boolean isCorrect       // To'g'ri yoki noto'g'riligi
    ) {}

}