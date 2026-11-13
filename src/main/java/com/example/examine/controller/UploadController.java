package com.example.examine.controller;

import com.example.examine.dto.ResponseDto;
import com.example.examine.dto.UploadDto;
import com.example.examine.service.UploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * UploadController - Fayl va rasmlarni yuklash jarayonlarini boshqaruvchi REST API controller.
 * DIQQAT: Bu yerda hech qanday biznes-logika mavjud emas, barchasi UploadService'ga yuklangan.
 */
@RestController
@RequestMapping("/api/v1/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    /**
     * Fayl yuklash uchun pre-signed URL so'rash.
     * POST /api/v1/uploads/request
     */
    @PostMapping("/request")
    public ResponseEntity<ResponseDto<UploadDto.UploadResponse>> request(
            @Valid @RequestBody UploadDto.UploadRequest dto) {
        UploadDto.UploadResponse response = uploadService.request(dto);
        return ResponseEntity.ok(ResponseDto.getSuccess(response));
    }

    /**
     * Fayl yuklanishini tasdiqlash.
     * POST /api/v1/uploads/{id}/confirm
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<ResponseDto<UploadDto.UploadConfirmResponse>> confirm(@PathVariable String id) {
        UploadDto.UploadConfirmResponse response = uploadService.confirm(id);
        return ResponseEntity.ok(ResponseDto.getSuccess(response));
    }

    /**
     * Kalit bo'yicha rasm havolasini olish.
     * GET /api/v1/uploads/image-url?key=...
     */
    @GetMapping("/image-url")
    public ResponseEntity<ResponseDto<UploadDto.ImageUrlResponse>> imageUrl(@RequestParam String key) {
        UploadDto.ImageUrlResponse response = uploadService.imageUrl(key);
        return ResponseEntity.ok(ResponseDto.getSuccess(response));
    }

    /**
     * Faylni o'chirish.
     * DELETE /api/v1/uploads/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDto<UploadDto.DeletedResponse>> delete(@PathVariable String id) {
        uploadService.delete(id);
        return ResponseEntity.ok(ResponseDto.getSuccess(new UploadDto.DeletedResponse(id, true)));
    }
}