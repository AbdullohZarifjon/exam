package com.example.examine.entity;

import com.example.examine.constant.UploadStatus;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.OffsetDateTime;

/**
 * UploadEntity - S3/MinIO ga yuklanadigan fayl va rasmlar holatini kuzatuvchi jadval.
 */
@Document(collection = "uploads")
@CompoundIndex(name = "entity_lookup_idx", def = "{'entityType': 1, 'entityId': 1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadEntity {
    @Id
    private String id;
    private String entityType;
    private String entityId;
    private String key;
    private String originalName;
    private String extension;
    private String contentType;
    private Long sizeBytes;

    @Builder.Default
    private UploadStatus status = UploadStatus.PENDING;

    private Instant confirmedAt;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;
    @Version
    @Builder.Default
    private Long version = 0L;
}