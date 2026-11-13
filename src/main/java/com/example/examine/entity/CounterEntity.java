package com.example.examine.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * CounterEntity - Talaba kodi kabi ketma-ket raqamlarni generatsiya qilish uchun ombor (Collection: "counters").
 */
@Document(collection = "counters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CounterEntity {

    /**
     * Hisoblagich kaliti (Masalan: "student_code").
     */
    @Id
    private String key;

    /**
     * Joriy tartib raqami (Sequence).
     */
    @Builder.Default
    private Long seq = 0L;
}