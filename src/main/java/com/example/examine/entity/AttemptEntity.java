package com.example.examine.entity;

import com.example.examine.constant.AttemptStatus;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * AttemptEntity - Talabaning imtihon topshirish jarayoni va urinishlari tarixi (Collection: "attempts").
 * Talaba "Start" tugmasini bosganda savollar bankidan tasodifiy tanlanadi,
 * variantlari aralashtirilib (shuffle) ushbu dokument ichiga snapshot (nusxa) sifatida saqlanadi.
 */
@Document(collection = "attempts")
@CompoundIndexes({
        @CompoundIndex(name = "student_exam_idx", def = "{'studentId': 1, 'examId': 1}"),
        @CompoundIndex(name = "status_expires_idx", def = "{'status': 1, 'expiresAt': 1}")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttemptEntity {

    /**
     * Urinishning unikal identifikatori.
     */
    @Id
    private String id;

    /**
     * Qaysi imtihon topshirilayotganini bildiruvchi ID (Indexed).
     */
    @Indexed
    private String examId;

    /**
     * Imtihon topshirayotgan talabaning ID si (Indexed).
     */
    @Indexed
    private String studentId;

    /**
     * Imtihon urinishining joriy statusi (IN_PROGRESS - jarayonda, SUBMITTED - topshirilgan, EXPIRED - vaqti tugagan).
     */
    @Builder.Default
    private AttemptStatus status = AttemptStatus.IN_PROGRESS;

    /**
     * Imtihon uchun berilgan vaqt (daqiqalarda).
     */
    private Integer durationMinutes;

    /**
     * Imtihon boshlangan vaqt.
     */
    @CreatedDate
    private Instant startedAt;

    /**
     * Imtihon tugaydigan oxirgi muddat.
     */
    private Instant expiresAt;

    /**
     * Talaba imtihonni topshirgan vaqti.
     */
    private Instant submittedAt;

    /**
     * Imtihondagi umumiy savollar soni.
     */
    private Integer totalQuestions;

    /**
     * To'g'ri topilgan javoblar soni.
     */
    private Integer totalCorrect;

    /**
     * To'plagan balli.
     */
    private Integer score;

    /**
     * Mumkin bo'lgan maksimal ball.
     */
    private Integer maxScore;

    /**
     * Foizdagi natijasi (Masalan: 90%).
     */
    private Integer scorePercent;

    /**
     * Natijani tashqi havola orqali tekshirish uchun maxfiy token.
     */
    @Indexed(unique = true, sparse = true)
    private String resultToken;

    /**
     * Shaxsni tasdiqlash usuli (Masalan: "face").
     */
    private String identityMethod;

    /**
     * Shaxs tasdiqlangan vaqt.
     */
    private Instant identityVerifiedAt;

    /**
     * Face ID o'xshashlik ko'rsatkichi (Score).
     */
    private Double identityScore;

    /**
     * Nomzodlar orasidagi farq (Gap).
     */
    private Double identityGap;

    /**
     * Ishlatilgan yuzni tanish modeli.
     */
    private String identityModel;

    /**
     * Talabaga tasodifiy tanlab berilgan va variantlari aralashtirilgan savollar ro'yxati (Snapshot).
     */
    private List<AttemptQuestion> questions;

    /**
     * Imtihon davomidagi biometrik loglar tarixi.
     */
    private List<EntryLog> entryLog;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Version
    @Builder.Default
    private Long version = 0L;


    /**
     * AttemptQuestion - Talaba imtihonidagi bitta savol holati (Siz so'ragan oxirgi struktura).
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AttemptQuestion {

        /**
         * Asosiy savollar bankidagi QuestionEntity ning ID si.
         */
        private String questionId;

        /**
         * Savol matni.
         */
        private String text;

        /**
         * Talabaga ko'rsatish uchun ARALASHTIRILGAN variantlar ro'yxati.
         */
        private List<String> options;

        /**
         * Aralashtirilgandan keyin to'g'ri javob joylashgan aniq indeks (correct_index).
         */
        private Integer correctIndex;

        /**
         * Talaba belgilagan javobning indeksi (answer_index). Hali belgilanmagan bo'sa null.
         */
        private Integer answerIndex;

        /**
         * Javob to'g'riligi (true / false).
         */
        private Boolean isCorrect;

        /**
         * Talaba javob belgilagan vaqt.
         */
        private Instant answeredAt;
    }


    /**
     * EntryLog - Imtihon davomidagi kirish va xavfsizlik loglari.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EntryLog {
        private Instant at;
        private String method;
        private Double score;
        private Double gap;
        private String model;
        private String staffId;
    }
}