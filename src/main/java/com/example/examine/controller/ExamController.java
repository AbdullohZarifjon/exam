package com.example.examine.controller;

import com.example.examine.constant.ExamStatus;
import com.example.examine.dto.ExamDto;
import com.example.examine.service.ExamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ExamController - Imtihonlarni boshqaruvchi REST API controller.
 * Barcha so'rovlar '/api/v1/exams' prefiksi ostida qabul qilinadi.
 */
@RestController
@RequestMapping("/api/v1/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    /**
     * Imtihonlar ro'yxatini olish endpointi.
     * GET /api/v1/exams?status=PUBLISHED
     */
    @GetMapping
    public ResponseEntity<List<ExamDto.ExamResponse>> list(
            @RequestParam(required = false) ExamStatus status,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        List<ExamDto.ExamResponse> result = examService.list(status, userId, role);
        return ResponseEntity.ok(result);
    }

    /**
     * Bitta imtihonni ID bo'yicha olish endpointi.
     * GET /api/v1/exams/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ExamDto.ExamResponse> get(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        ExamDto.ExamResponse response = examService.get(id, userId, role);
        return ResponseEntity.ok(response);
    }

    /**
     * Yangi imtihon yaratish endpointi.
     * POST /api/v1/exams
     */
    @PostMapping
    public ResponseEntity<ExamDto.ExamResponse> create(
            @RequestBody @Valid ExamDto.CreateExamRequest dto,
            @RequestHeader("X-User-Id") String userId) {
        ExamDto.ExamResponse createdExam = examService.create(dto, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdExam);
    }

    /**
     * Imtihon sozlamalarini yangilash endpointi.
     * PUT /api/v1/exams/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ExamDto.ExamResponse> update(
            @PathVariable String id,
            @RequestBody @Valid ExamDto.UpdateExamRequest dto,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String role) {
        ExamDto.ExamResponse updatedExam = examService.update(id, dto, userId, role);
        return ResponseEntity.ok(updatedExam);
    }

    /**
     * Imtihonni nashr qilish (Publish) endpointi.
     * POST /api/v1/exams/{id}/publish
     */
    @PostMapping("/{id}/publish")
    public ResponseEntity<ExamDto.ExamResponse> publish(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String role) {
        ExamDto.ExamResponse publishedExam = examService.publish(id, userId, role);
        return ResponseEntity.ok(publishedExam);
    }

    /**
     * Imtihonni arxivlash endpointi.
     * POST /api/v1/exams/{id}/archive
     */
    @PostMapping("/{id}/archive")
    public ResponseEntity<ExamDto.ExamResponse> archive(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String role) {
        ExamDto.ExamResponse archivedExam = examService.archive(id, userId, role);
        return ResponseEntity.ok(archivedExam);
    }

    /**
     * Imtihonni o'chirish endpointi.
     * DELETE /api/v1/exams/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String role) {
        examService.delete(id, userId, role);
        return ResponseEntity.noContent().build();
    }
}