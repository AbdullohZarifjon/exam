package com.example.examine.service;

import com.example.examine.constant.ExamStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.dto.QuestionDto;
import com.example.examine.entity.ExamEntity;
import com.example.examine.entity.QuestionEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.QuestionMapper;
import com.example.examine.repository.ExamRepository;
import com.example.examine.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * QuestionService - Savollar banki bilan bog'liq barcha biznes-logikani bajaruvchi servis.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final ExamRepository examRepository;
    private final QuestionMapper questionMapper;

    /**
     * Muayyan imtihonga tegishli barcha savollar ro'yxatini olish.
     */
    @Transactional(readOnly = true)
    public List<QuestionDto.QuestionResponse> list(String examId) {
        // Imtihon mavjudligini tekshiramiz
        if (!examRepository.existsById(examId)) {
            throw new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND);
        }
        List<QuestionEntity> questions = questionRepository.findByExamId(examId);
        return questionMapper.toDtoList(questions);
    }

    /**
     * ID bo'yicha bitta savol tafsilotlarini olish.
     */
    @Transactional(readOnly = true)
    public QuestionDto.QuestionResponse get(String id) {
        QuestionEntity question = questionRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.QUESTION_NOT_FOUND));
        return questionMapper.toDto(question);
    }

    /**
     * Yangi savol qo'shish.
     * MUHIM QOIDA: Imtihon statusi faqat DRAFT bo'lsagina savol qo'shish mumkin.
     * PUBLISHED yoki ARCHIVED bo'lsa, QUESTION_LOCKED xatoligini beradi.
     */
    public QuestionDto.QuestionResponse create(QuestionDto.CreateQuestionRequest dto) {
        ExamEntity exam = examRepository.findById(dto.examId())
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new CustomBadRequestException(ResponseType.QUESTION_LOCKED);
        }

        QuestionEntity question = questionMapper.toEntity(dto);
        if (question.getIsActive() == null) {
            question.setIsActive(true);
        }

        QuestionEntity savedQuestion = questionRepository.save(question);
        return questionMapper.toDto(savedQuestion);
    }

    /**
     * Mavjud savolni tahrirlash. Imtihon DRAFT holatida bo'lishi shart.
     */
    public QuestionDto.QuestionResponse update(String id, QuestionDto.UpdateQuestionRequest dto) {
        QuestionEntity question = questionRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.QUESTION_NOT_FOUND));

        ExamEntity exam = examRepository.findById(question.getExamId())
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new CustomBadRequestException(ResponseType.QUESTION_LOCKED);
        }

        questionMapper.updateEntityFromDto(dto, question);

        QuestionEntity savedQuestion = questionRepository.save(question);
        return questionMapper.toDto(savedQuestion);
    }

    /**
     * Savolni bazadan o'chirish. Imtihon DRAFT holatida bo'lishi shart.
     */
    public void delete(String id) {
        QuestionEntity question = questionRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.QUESTION_NOT_FOUND));

        ExamEntity exam = examRepository.findById(question.getExamId())
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new CustomBadRequestException(ResponseType.QUESTION_LOCKED);
        }

        questionRepository.delete(question);
    }
}