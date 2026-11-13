package com.example.examine.entity;

import com.example.examine.constant.VerificationStatus;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * VerificationRequestEntity - Yuz orqali to'liq o'ta olmagan talabalar uchun
 * xodimlar (Staff) tomonidan qo'shimcha tasdiqlash so'rovlari jadvali.
 */
@Document(collection = "verification_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerificationRequestEntity {
    @Id
    private String id;

    @Indexed
    private String examId;
    @Indexed
    private String studentId;
    private String studentCode;
    private List<Candidate> candidates;
    private String photoKey;

    @Builder.Default
    private VerificationStatus status = VerificationStatus.PENDING;

    private Instant expiresAt;

    private Instant ttlAt;

    private String claimTokenHash;
    private String decidedBy;
    private Instant decidedAt;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;
    @Version
    @Builder.Default
    private Long version = 0L;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Candidate {
        private String studentId;
        private Double score;
    }
}