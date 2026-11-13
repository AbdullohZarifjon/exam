package com.example.examine.controller;

import com.example.examine.dto.QuestionDto;
import com.example.examine.service.QuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * QuestionController - Savollarni boshqaruvchi REST API controller.
 * Barcha so'rovlar '/api/v1/questions' prefiksi ostida ishlaydi.
 */
@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    /**
     * Muayyan imtihondagi barcha savollar ro'yxatini olish.
     * GET /api/v1/questions/exam/{examId}
     */
    @GetMapping("/exam/{examId}")
    public ResponseEntity<List<QuestionDto.QuestionResponse>> list(@PathVariable String examId) {
        List<QuestionDto.QuestionResponse> result = questionService.list(examId);
        return ResponseEntity.ok(result);
    }

    /**
     * ID bo'yicha bitta savolni olish.
     * GET /api/v1/questions/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<QuestionDto.QuestionResponse> get(@PathVariable String id) {
        QuestionDto.QuestionResponse response = questionService.get(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Yangi savol yaratish (0-indeks to'g'ri javob qoidasi bilan).
     * POST /api/v1/questions
     */
    @PostMapping
    public ResponseEntity<QuestionDto.QuestionResponse> create(
            @RequestBody @Valid QuestionDto.CreateQuestionRequest dto) {
        QuestionDto.QuestionResponse created = questionService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Savolni tahrirlash.
     * PUT /api/v1/questions/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<QuestionDto.QuestionResponse> update(
            @PathVariable String id,
            @RequestBody @Valid QuestionDto.UpdateQuestionRequest dto) {
        QuestionDto.QuestionResponse updated = questionService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    /**
     * Savolni o'chirish.
     * DELETE /api/v1/questions/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        questionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}