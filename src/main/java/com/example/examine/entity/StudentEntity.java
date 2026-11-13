package com.example.examine.entity;

import com.example.examine.constant.FaceStatus;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * StudentEntity - Talabalar bazasi (Collection: "students").
 * Talabaning shaxsiy ma'lumotlari, unikal kodi va Face ID yuz biometriyasi ma'lumotlarini saqlaydi.
 */
@Document(collection = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentEntity {

    /**
     * Talabaning unikal identifikatori.
     */
    @Id
    private String id;

    /**
     * Talabaning F.I.O. (Full Name).
     */
    private String fullName;

    /**
     * Talabaning unikal tizimdagi kodi (Masalan: STU-2026-1) - Indexed & Unique.
     */
    @Indexed(unique = true)
    private String studentCode;

    /**
     * Talaba faol holatda ekanligi.
     */
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Sessiyalar yoki tokenlarni yangilash uchun versiya raqami.
     */
    @Builder.Default
    private Integer tokenVersion = 0;

    /**
     * Talabaning yuz biometriyasi ma'lumotlari (Embedded Object).
     */
    private Face face;

    /**
     * Talaba yuz ma'lumotlarini topshirishga rozilik bergan vaqti (Consent).
     */
    private Instant faceConsentAt;

    /**
     * Rozilik shartnomasi versiyasi.
     */
    private String faceConsentVersion;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Version
    private Long version = 0L;




    /**
     * Face - Yuzni tanish biometrik ma'lumotlarini saqlovchi ichki sinf.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Face {

        /**
         * Yuz ro'yxatdan o'tganlik holati (NOT_ENROLLED, ENROLLED, REJECTED).
         */
        @Builder.Default
        private FaceStatus status = FaceStatus.NOT_ENROLLED;

        /**
         * Yuz xususiyatlarini ifodalovchi 512lik raqamli vektor (Embedding).
         */
        private double[] embedding;

        /**
         * Yuz rasmining S3 omboridagi saqlanish kaliti.
         */
        private String photoKey;

        /**
         * Yuz ro'yxatdan o'tgan vaqt.
         */
        private OffsetDateTime enrolledAt;

        /**
         * Ro'yxatdan o'tkazgan xodimning (Staff) ID si.
         */
        private String enrolledBy;

        /**
         * Yuz rasmining sifat ko'rsatkichi (Quality Score).
         */
        private Double qualityScore;

        /**
         * Ishlatilgan yuzni aniqlash modeli (Masalan: "buffalo_s").
         */
        private String model;

        /**
         * O'xshash (lookalike) talabalar ID lari ro'yxati.
         */
        @Builder.Default
        private List<String> lookalikeWith = new ArrayList<>();
    }

    // Eski servislar bilan ishlash uchun qulay yordamchi getter/setter'lar (Flat Accessors)
    public FaceStatus getFaceStatus() { return face != null ? face.getStatus() : null; }
    public void setFaceStatus(FaceStatus v) { if (face == null) face = new Face(); face.setStatus(v); }
    public double[] getFaceEmbedding() { return face != null ? face.getEmbedding() : null; }
    public void setFaceEmbedding(double[] v) { if (face == null) face = new Face(); face.setEmbedding(v); }
    public String getFacePhotoKey() {
        return face != null ? face.getPhotoKey() : null;
    }
    public void setFacePhotoKey(String v) { if (face == null) face = new Face(); face.setPhotoKey(v); }
    public OffsetDateTime getFaceEnrolledAt() { return face != null ? face.getEnrolledAt() : null; }
    public void setFaceEnrolledAt(OffsetDateTime v) { if (face == null) face = new Face(); face.setEnrolledAt(v); }
    public String getFaceEnrolledBy() { return face != null ? face.getEnrolledBy() : null; }
    public void setFaceEnrolledBy(String v) { if (face == null) face = new Face(); face.setEnrolledBy(v); }
    public Double getFaceQualityScore() { return face != null ? face.getQualityScore() : null; }
    public void setFaceQualityScore(double v) { if (face == null) face = new Face(); face.setQualityScore(v); }
    public String getFaceModel() { return face != null ? face.getModel() : null; }
    public void setFaceModel(String v) { if (face == null) face = new Face(); face.setModel(v); }
    public List<String> getFaceLookalikeWith() { return face != null ? face.getLookalikeWith() : null; }
    public void setFaceLookalikeWith(List<String> v) { if (face == null) face = new Face(); face.setLookalikeWith(v); }
}