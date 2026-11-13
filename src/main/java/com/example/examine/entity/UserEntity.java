package com.example.examine.entity;

import com.example.examine.constant.UserRoleType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.time.OffsetDateTime;

/**
 * UserEntity - Tizim xodimlari / Admin va O'qituvchilar bazasi (Collection: "users").
 */
@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEntity {

    @Id
    private String id;
    private String fullName;

    /**
     * Tizimga kirish uchun username (Unikal).
     */
    @Indexed(unique = true)
    @Field("username")
    private String username;

    /**
     * Shifrlangan parol (Password Hash).
     */
    private String passwordHash;

    /**
     * Foydalanuvchi roli (admin, teacher).
     */
    private UserRoleType role;

    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private Integer tokenVersion = 0;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Version
    private Long version = 0L;
}