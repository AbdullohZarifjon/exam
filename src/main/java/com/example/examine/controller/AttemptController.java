package com.example.examine.controller;

import com.example.examine.dto.AttemptDto;
import com.example.examine.service.AttemptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AttemptController - Talabaning imtihon jarayoni va urinishlarini boshqaruvchi REST API.
 * Barcha so'rovlar '/api/v1/attempts' prefiksi ostida ishlaydi.
 */
@RestController
@RequestMapping("/api/v1/attempts")
@RequiredArgsConstructor
public class AttemptController {

    private final AttemptService attemptService;

    /**
     * Talaba imtihonni boshlaganda (Face ID tasdiqlangandan so'ng) chaqiriladi.
     * POST /api/v1/attempts/exam/{examId}/start
     */
    @PostMapping("/exam/{examId}/start")
    public ResponseEntity<AttemptDto.AttemptResponse> startExam(
            @PathVariable String examId,
            @RequestHeader("X-Student-Id") String studentId) {
        AttemptDto.AttemptResponse response = attemptService.startExam(examId, studentId);
        return ResponseEntity.ok(response);
    }

    /**
     * Talaba savolga javob belgilaganda (Har bir tanlov uchun).
     * POST /api/v1/attempts/{attemptId}/answer
     */
    @PostMapping("/{attemptId}/answer")
    public ResponseEntity<Void> submitAnswer(
            @PathVariable String attemptId,
            @RequestBody @Valid AttemptDto.SubmitAnswerRequest dto,
            @RequestHeader("X-Student-Id") String studentId) {
        attemptService.submitAnswer(attemptId, dto.questionId(), dto.answerIndex(), studentId);
        return ResponseEntity.ok().build();
    }

    /**
     * Imtihonni yakunlash va baholash tugmasi bosilganda.
     * POST /api/v1/attempts/{attemptId}/finish
     */
    @PostMapping("/{attemptId}/finish")
    public ResponseEntity<AttemptDto.AttemptResponse> finishExam(
            @PathVariable String attemptId,
            @RequestHeader("X-Student-Id") String studentId) {
        AttemptDto.AttemptResponse response = attemptService.finishExam(attemptId, studentId);
        return ResponseEntity.ok(response);
    }
}