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

/**
 * BiometricEventEntity - Biometrik tekshiruvlar va xavfsizlik loglari (Collection: "biometric_events").
 */
@Document(collection = "biometric_events")
@CompoundIndex(name = "attempt_event_idx", def = "{'attemptId': 1, 'createdAt': -1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricEventEntity {

    @Id
    private String id;

    @Indexed private String studentId;
    @Indexed private String examId;
    @Indexed private String attemptId;

    /**
     * Hodisa turi (enroll, identify, fail, revoke va h.k.).
     */
    private String event;
    private Double score;
    private Double gap;
    private String model;
    private String ip;
    private String ua; // User-Agent
    private String detail;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Version
    @Builder.Default
    private Long version = 0L;
}