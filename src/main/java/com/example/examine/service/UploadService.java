package com.example.examine.service;

import com.example.examine.constant.ResponseType;
import com.example.examine.constant.UploadStatus;
import com.example.examine.dto.UploadDto;
import com.example.examine.entity.UploadEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.UploadMapper;
import com.example.examine.repository.UploadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * UploadService - Fayl va rasmlarni yuklash uchun pre-signed URL generatsiya qilish,
 * ularning hajmi va turini tekshirish, shuningdek omborda tasdiqlash va o'chirish logikasini bajaruvchi servis.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UploadService {

    private final UploadRepository uploadRepository;
    private final StorageService storageService;
    private final UploadMapper uploadMapper;

    /** Maksimal ruxsat etilgan fayl hajmi: 10 Megabayt. */
    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024L * 1024L;

    /**
     * 1. Faylni yuklash uchun pre-signed PUT URL so'rash va bazaga PENDING holatida saqlash.
     */
    public UploadDto.UploadResponse request(UploadDto.UploadRequest dto) {
        // Fayl hajmi 10 MB dan oshib ketganligini tekshiramiz
        if (dto.sizeBytes() > MAX_FILE_SIZE_BYTES) {
            throw new CustomBadRequestException(ResponseType.UPLOAD_FILE_TOO_LARGE);
        }

        // Fayl turi rasm (image/*) ekanligini tekshiramiz
        if (dto.contentType() == null || !dto.contentType().startsWith("image/")) {
            throw new CustomBadRequestException(ResponseType.UPLOAD_FILE_TYPE_INVALID);
        }

        // Omborda saqlanishi uchun unikal S3 Key (fayl yo'li) generatsiya qilamiz
        String key = "uploads/" + UUID.randomUUID() + "/" + dto.fileName();

        UploadEntity uploadEntity = UploadEntity.builder()
                .entityType(dto.entityType())
                .entityId(dto.entityId())
                .key(key)
                .originalName(dto.fileName())
                .contentType(dto.contentType())
                .sizeBytes(dto.sizeBytes())
                .status(UploadStatus.PENDING)
                .build();

        UploadEntity savedEntity = uploadRepository.save(uploadEntity);

        // Storage servisdan faylni yuklash uchun vaqtinchalik pre-signed PUT URL olamiz
        String presignedPutUrl = storageService.presignedPut(key, dto.contentType());

        return new UploadDto.UploadResponse(
                String.valueOf(savedEntity.getId()),
                presignedPutUrl,
                key
        );
    }

    /**
     * 2. Fayl muvaffaqiyatli yuklanganligini tasdiqlash (Confirm).
     */
    public UploadDto.UploadConfirmResponse confirm(String id) {
        UploadEntity upload = uploadRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.UPLOAD_NOT_FOUND));

        // Fayl haqiqatan ham Storage (S3/MinIO) omboriga kelib tushganligini tekshiramiz
        if (!storageService.exists(upload.getKey())) {
            throw new CustomBadRequestException(ResponseType.UPLOAD_NOT_CONFIRMED);
        }

        upload.setStatus(UploadStatus.CONFIRMED);
        uploadRepository.save(upload);

        // Faylni o'qish uchun pre-signed GET URL olamiz
        String presignedGetUrl = storageService.presignedGet(upload.getKey());

        return uploadMapper.toConfirmResponse(upload, presignedGetUrl);
    }

    /**
     * 3. Kalit (Key) bo'yicha rasmning vaqtinchalik ko'rish havolasini olish.
     */
    @Transactional(readOnly = true)
    public UploadDto.ImageUrlResponse imageUrl(String key) {
        String presignedGetUrl = storageService.presignedGet(key);
        return uploadMapper.toImageUrlResponse(presignedGetUrl);
    }

    /**
     * 4. Faylni o'chirish (Statusni FAILED qilish yoki soft delete).
     */
    public void delete(String id) {
        UploadEntity upload = uploadRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.UPLOAD_NOT_FOUND));

        upload.setStatus(UploadStatus.FAILED);
        uploadRepository.save(upload);
    }
}