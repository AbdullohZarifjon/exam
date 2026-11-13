package com.example.examine.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * UploadDto - Fayl va rasmlarni yuklash, tasdiqlash va havolalarni olish
 * bilan bog'liq barcha DTO larni o'z ichiga oluvchi interfeys.
 */
public interface UploadDto {

    /**
     * Fayl yuklash uchun pre-signed URL so'rash uchun DTO (Request).
     */
    record UploadRequest(
            @NotBlank(message = "Entity turi (entityType) bo'sh bo'lishi mumkin emas")
            String entityType,

            @NotBlank(message = "Entity ID si bo'sh bo'lishi mumkin emas")
            String entityId,

            @NotBlank(message = "Fayl nomi (fileName) bo'sh bo'lishi mumkin emas")
            String fileName,

            @NotBlank(message = "Fayl tipi (contentType) ko'rsatilishi shart")
            String contentType,

            @NotNull(message = "Fayl hajmi (sizeBytes) ko'rsatilishi shart")
            @Min(value = 1, message = "Fayl hajmi 0 dan katta bo'lishi kerak")
            Long sizeBytes
    ) {}

    /**
     * Fayl yuklangandan keyin qaytariladigan pre-signed PUT URL va key DTO'si (Response).
     */
    record UploadResponse(
            String id,
            String uploadUrl,
            String key
    ) {}

    /**
     * Fayl yuklanishi tasdiqlangandan keyingi javob DTO'si.
     */
    record UploadConfirmResponse(
            String key,
            String url
    ) {}

    /**
     * Rasmning vaqtinchalik ko'rish havolasini (GET URL) qaytarish uchun DTO.
     */
    record ImageUrlResponse(
            String url
    ) {}

    /**
     * O'chirilganlik holatini tasdiqlovchi DTO.
     */
    record DeletedResponse(
            String id,
            boolean deleted
    ) {}
}