package com.example.examine.service;

import com.example.examine.constant.AttemptStatus;
import com.example.examine.constant.ExamStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.dto.AttemptDto;
import com.example.examine.dto.ResultDtoExport;
import com.example.examine.entity.AttemptEntity;
import com.example.examine.entity.ExamEntity;
import com.example.examine.entity.QuestionEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.AttemptMapper;
import com.example.examine.repository.AttemptRepository;
import com.example.examine.repository.ExamRepository;
import com.example.examine.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class AttemptService {

    private final AttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;
    private final ExamRepository examRepository;
    private final AttemptMapper attemptMapper;

    /**
     * Talaba imtihonni boshlaganda (Start) chaqiriladi.
     * 1. Agar davom etayotgan urinishi bo'lsa va vaqti tugamagan bo'lsa, uni qaytaradi.
     * 2. Aks holda, yangi Attempt ochib, savollarni random tanlaydi va variantlarni aralashtiradi (Shuffle).
     */
    public AttemptDto.AttemptResponse startExam(String examId, String studentId) {
        // 1. Faol urinish borligini tekshiramiz
        Optional<AttemptEntity> existingAttempt = attemptRepository.findByExamIdAndStudentIdAndStatus(
                examId, studentId, AttemptStatus.IN_PROGRESS
        );

        if (existingAttempt.isPresent()) {
            AttemptEntity attempt = existingAttempt.get();
            // Vaqti tugamagan bo'lsa shuni qaytaramiz
            if (attempt.getExpiresAt().isAfter(Instant.now())) {
                return attemptMapper.toDto(attempt);
            }
            // Vaqti tugagan bo'lsa EXPIRED statusiga o'tkazamiz
            attempt.setStatus(AttemptStatus.EXPIRED);
            attemptRepository.save(attempt);
        }

        // 2. Imtihon mavjudligi va PUBLISHED ekanligini tekshiramiz
        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        if (exam.getStatus() != ExamStatus.PUBLISHED) {
            throw new CustomBadRequestException(ResponseType.EXAM_NOT_PUBLISHED);
        }

        // 3. Savollar bankidan barcha faol savolarni olamiz
        List<QuestionEntity> activeQuestions = questionRepository.findByExamId(examId).stream()
                .filter(q -> Boolean.TRUE.equals(q.getIsActive()))
                .toList();

        if (activeQuestions.size() < exam.getQuestionsToServe()) {
            throw new CustomBadRequestException(ResponseType.EXAM_NOT_ENOUGH_QUESTIONS);
        }

        // 4. Savollarni random aralashtiramiz va imtihon talab qilgan miqdorda kesib olamiz
        List<QuestionEntity> shuffledQuestions = new ArrayList<>(activeQuestions);
        Collections.shuffle(shuffledQuestions);
        int limit = exam.getQuestionsToServe();
        List<QuestionEntity> selectedQuestions = shuffledQuestions.subList(0, limit);

        // 5. Har bir savol uchun variantlarni aralashtirib (Shuffle) snapshot hosil qilamiz
        List<AttemptEntity.AttemptQuestion> attemptQuestions = new ArrayList<>();

        for (QuestionEntity q : selectedQuestions) {
            // QOIDA: Asl bankda 0-indeksdagi element har doim to'g'ri javob matni hisoblanadi!
            String correctAnswerText = q.getOptions().get(0);

            // Variantlar nusxasini olib aralashtiramiz
            List<String> shuffledOptions = new ArrayList<>(q.getOptions());
            Collections.shuffle(shuffledOptions);

            // Aralashtirilgandan keyin to'g'ri javob qaysi indeksga tushganini topamiz
            int correctIndexAfterShuffle = shuffledOptions.indexOf(correctAnswerText);

            attemptQuestions.add(AttemptEntity.AttemptQuestion.builder()
                    .questionId(q.getId())
                    .text(q.getText())
                    .options(shuffledOptions)
                    .correctIndex(correctIndexAfterShuffle) // Maxfiy ravishda saqlanadi
                    .answerIndex(null) // Hali talaba javob bermagan
                    .isCorrect(false)
                    .build());
        }

        // 6. Yangi AttemptEntity yaratib saqlaymiz
        Instant now = Instant.now();
        AttemptEntity newAttempt = AttemptEntity.builder()
                .examId(examId)
                .studentId(studentId)
                .status(AttemptStatus.IN_PROGRESS)
                .durationMinutes(exam.getTimerMinutes())
                .startedAt(now)
                .expiresAt(now.plus(exam.getTimerMinutes(), ChronoUnit.MINUTES)) // Instant uchun zamonaviy usul
                .questions(attemptQuestions)
                .totalQuestions(limit)
                .build();

        AttemptEntity savedAttempt = attemptRepository.save(newAttempt);
        return attemptMapper.toDto(savedAttempt);
    }

    /**
     * Talabaning muayyan savolga bergan javobini saqlash.
     */
    public void submitAnswer(String attemptId, String questionId, Integer answerIndex, String studentId) {
        AttemptEntity attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.ATTEMPT_NOT_FOUND));

        if (!studentId.equals(attempt.getStudentId())) {
            throw new CustomBadRequestException(ResponseType.ATTEMPT_FORBIDDEN);
        }
        if (Instant.now().isAfter(attempt.getExpiresAt())) {
            attempt.setStatus(AttemptStatus.EXPIRED);
            attemptRepository.save(attempt);
            throw new CustomBadRequestException(ResponseType.ATTEMPT_EXPIRED);
        }
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new CustomBadRequestException(ResponseType.ATTEMPT_ALREADY_SUBMITTED);
        }

        // Kerakli savolni topib javob indeksini yozamiz
        boolean found = false;
        for (AttemptEntity.AttemptQuestion aq : attempt.getQuestions()) {
            if (aq.getQuestionId().equals(questionId)) {
                aq.setAnswerIndex(answerIndex);
                aq.setAnsweredAt(Instant.now());
                found = true;
                break;
            }
        }

        if (!found) {
            throw new CustomBadRequestException(ResponseType.QUESTION_NOT_FOUND);
        }

        attemptRepository.save(attempt);
    }

    /**
     * Imtihonni yakunlash va ballarni hisoblash (Grading).
     */
    public AttemptDto.AttemptResponse finishExam(String attemptId, String studentId) {
        AttemptEntity attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.ATTEMPT_NOT_FOUND));

        if (studentId != null && !studentId.equals(attempt.getStudentId())) {
            throw new CustomBadRequestException(ResponseType.ATTEMPT_FORBIDDEN);
        }

        if (attempt.getStatus() == AttemptStatus.SUBMITTED || attempt.getStatus() == AttemptStatus.EXPIRED) {
            return attemptMapper.toDto(attempt); // Allaqachon yakunlangan bo'lsa qaytaramiz
        }

        // Ballarni hisoblaymiz
        gradeAttempt(attempt);

        boolean isExpired = Instant.now().isAfter(attempt.getExpiresAt());
        attempt.setStatus(isExpired ? AttemptStatus.EXPIRED : AttemptStatus.SUBMITTED);
        attempt.setSubmittedAt(isExpired ? attempt.getExpiresAt() : Instant.now());
        attempt.setResultToken(UUID.randomUUID().toString().replace("-", ""));

        AttemptEntity savedAttempt = attemptRepository.save(attempt);
        return attemptMapper.toDto(savedAttempt);
    }

    /**
     * Avtomatik tekshirish va baholash mantig'i.
     */
    private void gradeAttempt(AttemptEntity attempt) {
        int correctCount = 0;
        List<AttemptEntity.AttemptQuestion> questions = attempt.getQuestions();

        if (questions != null) {
            for (AttemptEntity.AttemptQuestion aq : questions) {
                // Talaba tanlagan answerIndex bilan maxfiy correctIndex solishtiriladi
                boolean isCorrect = aq.getAnswerIndex() != null
                        && aq.getAnswerIndex().equals(aq.getCorrectIndex());
                aq.setIsCorrect(isCorrect);
                if (isCorrect) {
                    correctCount++;
                }
            }
            int total = questions.size();
            attempt.setTotalQuestions(total);
            attempt.setTotalCorrect(correctCount);
            attempt.setScore(correctCount);
            attempt.setMaxScore(total);
            attempt.setScorePercent(total == 0 ? 0 : Math.round(correctCount * 100f / total));
        }
    }

    /**
     * Maxfiy token orqali talabaning imtihon natijasini olish.
     *
     * @param resultToken Imtihon tugaganda generatsiya qilingan unikal token
     * @return  Natijalar va to'g'ri javoblar tahlili
     */
    @Transactional(readOnly = true)
    public ResultDtoExport.ResultDto resultByToken(String resultToken) {
        // Token bo'yicha Attempt ni qidiramiz
        AttemptEntity attempt = attemptRepository.findByResultToken(resultToken)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.RESULT_NOT_FOUND));

        // Savollar va javoblar tahlilini yig'amiz
        List<ResultDtoExport.ResultQuestionDto> questionResults = new ArrayList<>();

        if (attempt.getQuestions() != null) {
            for (AttemptEntity.AttemptQuestion aq : attempt.getQuestions()) {
                questionResults.add(new ResultDtoExport.ResultQuestionDto(
                        aq.getQuestionId(),
                        aq.getText(),
                        aq.getOptions(),
                        aq.getCorrectIndex(), // Natija sahifasida to'g'ri javob indeksi ko'rinadi
                        aq.getAnswerIndex(),  // Talabaning javobi
                        aq.getIsCorrect()     // To'g'ri ishlagani
                ));
            }
        }

        return new ResultDtoExport.ResultDto(
                attempt.getId(),
                attempt.getExamId(),
                attempt.getStudentId(),
                attempt.getStatus() != null ? attempt.getStatus().name().toLowerCase() : null,
                attempt.getTotalQuestions(),
                attempt.getTotalCorrect(),
                attempt.getScore(),
                attempt.getMaxScore(),
                attempt.getScorePercent(),
                attempt.getSubmittedAt() != null ? attempt.getSubmittedAt().toString() : null,
                questionResults
        );
    }
}