package com.example.examine.service;

import com.example.examine.constant.ExamStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.constant.UserRoleType;
import com.example.examine.dto.ExamDto;
import com.example.examine.entity.ExamEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.ExamMapper;
import com.example.examine.repository.ExamRepository;
import com.example.examine.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * ExamService - Imtihonlar modulining asosiy biznes logikasini boshqaruvchi servis.
 * SOLID ning Single Responsibility prinsiplariga mos holda yozilgan.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ExamService {

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final ExamMapper examMapper;

    /**
     * Imtihonlar ro'yxatini filtrlab olish.
     * Admin: Barcha imtihonlarni ko'ra oladi.
     * O'qituvchi: O'zi yaratgan yoki PUBLISHED bo'lgan imtihonlarni ko'radi.
     * Talaba: Faqat PUBLISHED statusidagi imtihonlarni ko'radi.
     */
    @Transactional(readOnly = true)
    public List<ExamDto.ExamResponse> list(ExamStatus status, String userId, String role) {
        List<ExamEntity> exams = examRepository.findAll();

        List<ExamEntity> filteredExams = exams.stream()
                .filter(exam -> status == null || exam.getStatus() == status)
                .filter(exam -> "admin".equals(role)
                        || exam.getStatus() == ExamStatus.PUBLISHED
                        || (userId != null && userId.equals(exam.getCreatedBy())))
                .toList();

        return examMapper.toDtoList(filteredExams);
    }

    /**
     * ID bo'yicha imtihon ma'lumotlarini olish.
     * Ruxsat tekshiruvi berilgan: DRAFT imtihonni faqat egasi yoki Admin ko'ra oladi.
     */
    @Transactional(readOnly = true)
    public ExamDto.ExamResponse get(String id, String userId, String role) {
        ExamEntity exam = examRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        boolean isAdmin = UserRoleType.ADMIN.name().equals(role);
        boolean isPublished = exam.getStatus() == ExamStatus.PUBLISHED;
        boolean isOwner = userId != null && userId.equals(exam.getCreatedBy());

        if (!isAdmin && !isPublished && !isOwner) {
            throw new CustomBadRequestException(ResponseType.EXAM_FORBIDDEN);
        }

        return examMapper.toDto(exam);
    }

    /**
     * Yangi imtihon yaratish. Har doim DRAFT holatida saqlanadi.
     */
    public ExamDto.ExamResponse create(ExamDto.CreateExamRequest dto, String userId) {
        ExamEntity exam = examMapper.toEntity(dto);

        // Standart boshlang'ich qiymatlar o'rnatiladi
        exam.setStatus(ExamStatus.DRAFT);
        exam.setCreatedBy(userId);
        if (exam.getTimerMinutes() == null) exam.setTimerMinutes(60);
        if (exam.getQuestionsToServe() == null) exam.setQuestionsToServe(100);

        ExamEntity savedExam = examRepository.save(exam);
        return examMapper.toDto(savedExam);
    }

    /**
     * Imtihon sozlamalarini yangilash.
     * Diqqat: Imtihon PUBLISHED bo'lgandan keyin uning taymer va savol cheklovlarini o'zgartirib bo'lmaydi!
     */
    public ExamDto.ExamResponse update(String id, ExamDto.UpdateExamRequest dto, String userId, String role) {
        ExamEntity exam = examRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        checkOwner(exam, userId, role);

        // MapStruct orqali mavjud entity yangilanadi (null qiymatlar o'zgartirilmaydi)
        examMapper.updateEntityFromDto(dto, exam);

        return examMapper.toDto(examRepository.save(exam));
    }

    /**
     * Imtihonni nashr qilish (Publish).
     * Shart: Imtihonda kamida 'questionsToServe' miqdorida faol savollar bo'lishi kerak.
     */
    public ExamDto.ExamResponse publish(String id, String userId, String role) {
        ExamEntity exam = examRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        checkOwner(exam, userId, role);

        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new CustomBadRequestException(ResponseType.EXAM_INVALID_STATUS_TRANSITION);
        }

        // Bazadagi faol savollar sonini tekshiramiz
        long activeQuestionsCount = questionRepository.findByExamId(id).stream()
                .filter(q -> Boolean.TRUE.equals(q.getIsActive()))
                .count();

        if (activeQuestionsCount < exam.getQuestionsToServe()) {
            throw new CustomBadRequestException(ResponseType.EXAM_NOT_ENOUGH_QUESTIONS);
        }

        // Qulflaymiz (PUBLISHED statusiga o'tkazamiz)
        exam.setStatus(ExamStatus.PUBLISHED);
        return examMapper.toDto(examRepository.save(exam));
    }

    /**
     * Imtihonni arxivlash (O'quv yili tugaganda yoki imtihon to'xtatilganda).
     */
    public ExamDto.ExamResponse archive(String id, String userId, String role) {
        ExamEntity exam = examRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        checkOwner(exam, userId, role);

        if (exam.getStatus() != ExamStatus.PUBLISHED) {
            throw new CustomBadRequestException(ResponseType.EXAM_INVALID_STATUS_TRANSITION);
        }

        exam.setStatus(ExamStatus.ARCHIVED);
        return examMapper.toDto(examRepository.save(exam));
    }

    /**
     * Imtihonni o'chirish. Faqat muallif yoki Admin o'chira oladi.
     */
    public void delete(String id, String userId, String role) {
        ExamEntity exam = examRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        checkOwner(exam, userId, role);
        examRepository.delete(exam);
    }

    /**
     * Foydalanuvchining imtihonga mualliflik huquqini tekshiruvchi yordamchi metod.
     */
    private void checkOwner(ExamEntity exam, String userId, String role) {
        boolean isAdmin = UserRoleType.ADMIN.name().equals(role) || UserRoleType.TEACHER.name().equals(role);
        boolean isCreator = userId != null && userId.equals(exam.getCreatedBy());
        if (!isAdmin && !isCreator) {
            throw new CustomBadRequestException(ResponseType.EXAM_FORBIDDEN);
        }
    }
}