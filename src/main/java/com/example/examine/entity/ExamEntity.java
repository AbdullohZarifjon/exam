package com.example.examine.entity;

import com.example.examine.constant.ExamStatus;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * ExamEntity - Imtihonlar jadvali (Collection: "exams").
 * Imtihonning nomi, vaqti, o'tish ballari va uning joriy holatini (DRAFT, PUBLISHED, ARCHIVED) saqlaydi.
 */
@Document(collection = "exams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamEntity {

    /**
     * Imtihonning unikal identifikatori (MongoDB ObjectId).
     */
    @Id
    private String id;

    /**
     * Imtihonning nomi (Masalan: "Java Backend dasturlashdan yakuniy imtihon").
     */
    private String title;

    /**
     * Imtihon haqida qisqacha ma'lumot yoki yo'riqnoma.
     */
    private String description;

    /**
     * Imtihonning holati (DRAFT - qoralama/tahrirlanayotgan, PUBLISHED - nashr qilingan/qulflangan, ARCHIVED - arxiv).
     */
    @Builder.Default
    private ExamStatus status = ExamStatus.DRAFT;

    /**
     * Imtihon uchun berilgan umumiy vaqt (daqiqalarda).
     */
    private Integer timerMinutes;

    /**
     * Talabaga imtihonda nechta savol berilishi kerakligi (Standart: 100 ta).
     */
    @Builder.Default
    private Integer questionsToServe = 100;

    /**
     * Imtihondan o'tish uchun talab qilinadigan minimal foiz (Masalan: 60%).
     */
    private Integer passingScorePercent;

    /**
     * Imtihondan o'tish uchun talab qilinadigan minimal ball.
     */
    private Integer passingScorePoints;

    /**
     * Ushbu imtihonni yaratgan o'qituvchi yoki adminning ID si (Indexed).
     */
    @Indexed
    private String createdBy;

    /**
     * Imtihon yaratilgan vaqti (Spring Data Mongo avtomatik beradi).
     */
    @CreatedDate
    private Instant createdAt;

    /**
     * Imtihon oxirgi marta tahrirlangan vaqti.
     */
    @LastModifiedDate
    private Instant updatedAt;

    /**
     * Ma'lumotlar ziddiyatining (Race Condition) oldini olish uchun optimistik blokirovka versiyasi.
     */
    @Version
    @Builder.Default
    private Long version = 0L;
}