package com.example.examine.service;

import com.example.examine.constant.ResponseType;
import com.example.examine.exception.CustomBadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * FaceService - Python tili va DeepFace/ArcFace asosida ishlaydigan tashqi yuzni tanish
 * mikroservisiga (Face API) REST so'rovlarini yuboruvchi xavfsiz HTTP mijoz (Client).
 */
@Service
@RequiredArgsConstructor
public class FaceService {

    /** Spring 6 ning zamonaviy va yengil HTTP mijozi. */
    private final RestClient restClient;

    /** Tashqi Python servisining asosiy URL manzili (application.yml dan o'qiladi). */
    @Value("${face-service.base-url}")
    private String baseUrl;

    /**
     * Tashqi servisga POST so'rovlarini xavfsiz yuborish uchun yordamchi generic metod.
     *
     * @path API endpoint manzili (masalan: "/embed")
     * @body Yuboriladigan ma'lumotlar (Payload)
     * @return Servisdan qaytgan JSON javob (Map ko'rinishida)
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> sendPostRequest(String path, Object body) {
        try {
            Map<String, Object> response = restClient.post()
                    .uri(baseUrl + path)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            return response == null ? Map.of() : response;
        } catch (CustomBadRequestException e) {
            // Biznes xatoliklarini to'g'ridan-to'g'ri o'tkazib yuboramiz
            throw e;
        } catch (Exception e) {
            // Agar Python servis ishlamayotgan bo'lsa, maxsus xatolik tashlaymiz
            throw new CustomBadRequestException(ResponseType.FACE_SERVICE_UNAVAILABLE);
        }
    }

    /**
     * 1. Berilgan Base64 rasmdan yuz xususiyatlari vektorini (Embedding) ajratib olish.
     */
    public Map<String, Object> embed(String imageBase64) {
        return sendPostRequest("/embed", Map.of("imageBase64", imageBase64));
    }

    /**
     * 2. Vektor (Embedding) bo'yicha bazadan mos keluvchi talabalarni qidirish (Identify).
     */
    public Map<String, Object> identifyByEmbedding(List<Double> embedding) {
        return sendPostRequest("/identify", Map.of("embedding", embedding));
    }

    /**
     * 3. Talabaning yuz vektorini Python servisining qidiruv indeksiga qo'shish (Enroll).
     */
    public Map<String, Object> enrollEmbedding(String studentId, List<Double> embedding) {
        return sendPostRequest("/enroll", Map.of("studentId", studentId, "embedding", embedding));
    }

    /**
     * 4. Barcha talabalar bazasini qaytadan indeksatsiya qilish (Rebuild).
     */
    public Map<String, Object> rebuild(List<Map<String, Object>> items) {
        return sendPostRequest("/rebuild", Map.of("items", items));
    }

    /**
     * 5. Ikki xil rasm bir kishiga tegishli ekanligini solishtirish (Verify Pair).
     */
    public Map<String, Object> verifyPair(String probeImage, String galleryImage) {
        return sendPostRequest("/verify-pair", Map.of("probeImageBase64", probeImage, "galleryImageBase64", galleryImage));
    }

    /**
     * 6. Talaba o'chirilganda uning yuz vektorini Python servisidan ham o'chirish.
     */
    public void deleteStudent(String studentId) {
        try {
            restClient.delete()
                    .uri(baseUrl + "/student/" + studentId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ignored) {
            // Idempotent operatsiya: servisda topilmasa ham xatolik bermaydi
        }
    }

    /**
     * 7. Python mikroservisining ishlash holatini (Health check) tekshirish.
     */
    public boolean health() {
        try {
            restClient.get()
                    .uri(baseUrl + "/health")
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}