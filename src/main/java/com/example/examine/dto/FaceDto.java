package com.example.examine.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * FaceDto - Biometriya va Face ID modulisiga tegishli so'rov (Request)
 * va javob (Response) DTO larni o'z ichiga oluvchi interfeys.
 * 'Interface inside Record Pattern' yordamida kodni tartibli saqlash uchun ishlatiladi.
 */
public interface FaceDto {

    /**
     * Talabaning yuzi orqali imtihonga kirishi va sessiyani boshlashi uchun so'rov DTO'si.
     */
    record FaceIdentifyRequest(
            @NotBlank(message = "Imtihon ID si bo'sh bo'lishi mumkin emas")
            String examId,

            @NotBlank(message = "Rasm ma'lumoti (imageBase64) bo'sh bo'lishi mumkin emas")
            String imageBase64
    ) {}

    /**
     * Talabaning yuzini bazada ro'yxatdan o'tkazish (Enrollment) uchun so'rov DTO'si.
     */
    record FaceEnrollRequest(
            @NotBlank(message = "Talaba ID si bo'sh bo'lishi mumkin emas")
            String studentId,

            @NotBlank(message = "Rasm ma'lumoti (imageBase64) bo'sh bo'lishi mumkin emas")
            String imageBase64
    ) {}

    /**
     * Talabaning yuz rasmi havolasini qaytarish uchun Response DTO.
     */
    record FacePhotoResponse(
            String url,
            String photoKey
    ) {}

    /**
     * Kiosk: look-alike talaba kod + jonli selfie bilan staff tasdig'ini so'rashi (Request).
     */
    record VerifyRequestCreateRequest(
            @NotBlank(message = "Imtihon ID si bo'sh bo'lishi mumkin emas")
            String examId,

            @NotBlank(message = "Talaba kodi bo'sh bo'lishi mumkin emas")
            String studentCode,

            @NotBlank(message = "Rasm (imageBase64) bo'sh bo'lishi mumkin emas")
            String imageBase64
    ) {}

    /**
     * Tasdiqlash so'rovi yaratilgandan keyin kioskga qaytariladigan javob (claim token bilan).
     */
    record VerifyRequestCreatedResponse(
            String requestId,
            String claimToken,
            String status,
            String expiresAt
    ) {}

    /**
     * Staff navbati (Verification tab) uchun so'rov DTO'si.
     */
    record VerifyRequestStaffResponse(
            String id,
            String examId,
            String studentId,
            String studentCode,
            String status,
            String createdAt,
            String expiresAt
    ) {}
}