package com.example.examine.entity;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * QuestionEntity - Imtihon savollarining asl banki / Master Bank (Collection: "questions").
 * QOIDA: O'qituvchi kiritgan variantlar ro'yxatining DOIMO 0-indeksidagi element TO'G'RI JAVOB hisoblanadi.
 * Imtihon PUBLISHED bo'lgach, bu yerdagi savollar o'zgartirilmaydi.
 */
@Document(collection = "questions")
@CompoundIndex(name = "exam_active_idx", def = "{'examId': 1, 'isActive': 1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionEntity {

    /**
     * Savolning unikal identifikatori.
     */
    @Id
    private String id;

    /**
     * Ushbu savol qaysi imtihonga tegishli ekanligini bildiruvchi tashqi ID (Indexed).
     */
    @Indexed
    private String examId;

    /**
     * Savolning matni.
     */
    private String text;

    /**
     * Variantlar ro'yxati (List).
     * Qoida: options.get(0) -> Har doim to'g'ri javob matni bo'ladi.
     */
    private List<String> options;

    /**
     * Savolga berilgan tushuntirish / izoh (Imtihondan keyin ko'rsatish uchun).
     */
    private String explanation;

    /**
     * Agar savolda rasm bo'lsa, uning S3 yoki fayl omboridagi saqlanish kaliti.
     */
    private String imageUrl;

    /**
     * Savol faol holatda ekanligi (true - ishlatiladi, false - o'chirilgan/yashirilgan).
     */
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Savol yaratilgan vaqti.
     */
    @CreatedDate
    private Instant createdAt;

    /**
     * Savol oxirgi marta tahrirlangan vaqti.
     */
    @LastModifiedDate
    private Instant updatedAt;

    /**
     * Optimistik blokirovka versiyasi.
     */
    @Version
    @Builder.Default
    private Long version = 0L;
}