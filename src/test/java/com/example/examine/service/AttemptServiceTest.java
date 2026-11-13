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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttemptServiceTest {

    @Mock
    private AttemptRepository attemptRepository;
    @Mock
    private QuestionRepository questionRepository;
    @Mock
    private ExamRepository examRepository;
    @Mock
    private AttemptMapper attemptMapper;

    @InjectMocks
    private AttemptService attemptService;

    private ExamEntity publishedExam(int questionsToServe) {
        return ExamEntity.builder()
                .id("exam-1")
                .status(ExamStatus.PUBLISHED)
                .questionsToServe(questionsToServe)
                .timerMinutes(60)
                .build();
    }

    private QuestionEntity question(String id, String correct) {
        return QuestionEntity.builder()
                .id(id)
                .examId("exam-1")
                .text("Question " + id)
                .options(List.of(correct, "wrong-1", "wrong-2", "wrong-3"))
                .isActive(true)
                .build();
    }

    private AttemptEntity attempt(AttemptStatus status, Instant expiresAt) {
        return AttemptEntity.builder()
                .id("attempt-1")
                .examId("exam-1")
                .studentId("student-1")
                .status(status)
                .expiresAt(expiresAt)
                .questions(new ArrayList<>())
                .build();
    }

    private AttemptDto.AttemptResponse response(String id) {
        return new AttemptDto.AttemptResponse(id, "exam-1", "student-1", "in_progress",
                60, null, null, null, 0, 0, 0, 0, 0, null, List.of());
    }

    @Test
    void startExam_existingActiveAttempt_returnsIt() {
        AttemptEntity existing = attempt(AttemptStatus.IN_PROGRESS, Instant.now().plus(10, ChronoUnit.MINUTES));
        when(attemptRepository.findByExamIdAndStudentIdAndStatus(
                "exam-1", "student-1", AttemptStatus.IN_PROGRESS)).thenReturn(Optional.of(existing));
        when(attemptMapper.toDto(existing)).thenReturn(response("attempt-1"));

        AttemptDto.AttemptResponse result = attemptService.startExam("exam-1", "student-1");

        assertThat(result.id()).isEqualTo("attempt-1");
        verify(attemptRepository, never()).save(any(AttemptEntity.class));
    }

    @Test
    void startExam_existingExpiredAttempt_marksExpiredAndCreatesNew() {
        AttemptEntity existing = attempt(AttemptStatus.IN_PROGRESS, Instant.now().plus(1, ChronoUnit.MINUTES));
        when(attemptRepository.findByExamIdAndStudentIdAndStatus(
                "exam-1", "student-1", AttemptStatus.IN_PROGRESS)).thenReturn(Optional.of(existing));
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(publishedExam(1)));
        when(questionRepository.findByExamId("exam-1")).thenReturn(List.of(question("q1", "A")));
        when(attemptRepository.save(any(AttemptEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(attemptMapper.toDto(any(AttemptEntity.class))).thenReturn(response("new"));

        attemptService.startExam("exam-1", "student-1");

        assertThat(existing.getStatus()).isEqualTo(AttemptStatus.EXPIRED);
        verify(attemptRepository, org.mockito.Mockito.times(2)).save(any(AttemptEntity.class));
    }

    @Test
    void startExam_examNotFound_throws() {
        when(attemptRepository.findByExamIdAndStudentIdAndStatus(anyString(), anyString(), any()))
                .thenReturn(Optional.empty());
        when(examRepository.findById("exam-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attemptService.startExam("exam-1", "student-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void startExam_examNotPublished_throws() {
        when(attemptRepository.findByExamIdAndStudentIdAndStatus(anyString(), anyString(), any()))
                .thenReturn(Optional.empty());
        ExamEntity draft = publishedExam(1);
        draft.setStatus(ExamStatus.DRAFT);
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> attemptService.startExam("exam-1", "student-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_PUBLISHED.getMessageFormat());
    }

    @Test
    void startExam_notEnoughQuestions_throws() {
        when(attemptRepository.findByExamIdAndStudentIdAndStatus(anyString(), anyString(), any()))
                .thenReturn(Optional.empty());
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(publishedExam(3)));
        when(questionRepository.findByExamId("exam-1")).thenReturn(List.of(question("q1", "A")));

        assertThatThrownBy(() -> attemptService.startExam("exam-1", "student-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_ENOUGH_QUESTIONS.getMessageFormat());
    }

    @Test
    void startExam_success_buildsShuffledSnapshot() {
        when(attemptRepository.findByExamIdAndStudentIdAndStatus(anyString(), anyString(), any()))
                .thenReturn(Optional.empty());
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(publishedExam(2)));
        when(questionRepository.findByExamId("exam-1")).thenReturn(List.of(
                question("q1", "A"), question("q2", "B"), question("q3", "C")));
        when(attemptRepository.save(any(AttemptEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(attemptMapper.toDto(any(AttemptEntity.class))).thenReturn(response("new"));

        attemptService.startExam("exam-1", "student-1");

        ArgumentCaptor<AttemptEntity> captor = ArgumentCaptor.forClass(AttemptEntity.class);
        verify(attemptRepository).save(captor.capture());
        AttemptEntity saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(AttemptStatus.IN_PROGRESS);
        assertThat(saved.getTotalQuestions()).isEqualTo(2);
        assertThat(saved.getQuestions()).hasSize(2);
        assertThat(saved.getStartedAt()).isNotNull();
        assertThat(saved.getExpiresAt()).isAfter(saved.getStartedAt());
        for (AttemptEntity.AttemptQuestion aq : saved.getQuestions()) {
            assertThat(aq.getAnswerIndex()).isNull();
            assertThat(aq.getIsCorrect()).isFalse();
            assertThat(aq.getOptions().get(aq.getCorrectIndex())).isIn("A", "B", "C");
        }
    }

    @Test
    void submitAnswer_attemptNotFound_throws() {
        when(attemptRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attemptService.submitAnswer("missing", "q1", 0, "student-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.ATTEMPT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void submitAnswer_wrongStudent_throwsForbidden() {
        when(attemptRepository.findById("attempt-1"))
                .thenReturn(Optional.of(attempt(AttemptStatus.IN_PROGRESS, Instant.now().plus(5, ChronoUnit.MINUTES))));

        assertThatThrownBy(() -> attemptService.submitAnswer("attempt-1", "q1", 0, "other"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.ATTEMPT_FORBIDDEN.getMessageFormat());
    }

    @Test
    void submitAnswer_expired_marksExpiredAndThrows() {
        AttemptEntity attempt = attempt(AttemptStatus.IN_PROGRESS, Instant.now().plus(1, ChronoUnit.MINUTES));
        when(attemptRepository.findById("attempt-1")).thenReturn(Optional.of(attempt));

        assertThatThrownBy(() -> attemptService.submitAnswer("attempt-1", "q1", 0, "student-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.ATTEMPT_EXPIRED.getMessageFormat());
        assertThat(attempt.getStatus()).isEqualTo(AttemptStatus.EXPIRED);
        verify(attemptRepository).save(attempt);
    }

    @Test
    void submitAnswer_alreadySubmitted_throws() {
        AttemptEntity attempt = attempt(AttemptStatus.SUBMITTED, Instant.now().plus(5, ChronoUnit.MINUTES));
        when(attemptRepository.findById("attempt-1")).thenReturn(Optional.of(attempt));

        assertThatThrownBy(() -> attemptService.submitAnswer("attempt-1", "q1", 0, "student-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.ATTEMPT_ALREADY_SUBMITTED.getMessageFormat());
    }

    @Test
    void submitAnswer_questionNotFound_throws() {
        AttemptEntity attempt = attempt(AttemptStatus.IN_PROGRESS, Instant.now().plus(5, ChronoUnit.MINUTES));
        attempt.getQuestions().add(AttemptEntity.AttemptQuestion.builder().questionId("q1").build());
        when(attemptRepository.findById("attempt-1")).thenReturn(Optional.of(attempt));

        assertThatThrownBy(() -> attemptService.submitAnswer("attempt-1", "q2", 0, "student-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.QUESTION_NOT_FOUND.getMessageFormat());
    }

    @Test
    void submitAnswer_success_recordsAnswer() {
        AttemptEntity attempt = attempt(AttemptStatus.IN_PROGRESS, Instant.now().plus(5, ChronoUnit.MINUTES));
        AttemptEntity.AttemptQuestion aq = AttemptEntity.AttemptQuestion.builder().questionId("q1").build();
        attempt.getQuestions().add(aq);
        when(attemptRepository.findById("attempt-1")).thenReturn(Optional.of(attempt));

        attemptService.submitAnswer("attempt-1", "q1", 2, "student-1");

        assertThat(aq.getAnswerIndex()).isEqualTo(2);
        assertThat(aq.getAnsweredAt()).isNotNull();
        verify(attemptRepository).save(attempt);
    }

    @Test
    void finishExam_attemptNotFound_throws() {
        when(attemptRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attemptService.finishExam("missing", "student-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.ATTEMPT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void finishExam_wrongStudent_throwsForbidden() {
        when(attemptRepository.findById("attempt-1"))
                .thenReturn(Optional.of(attempt(AttemptStatus.IN_PROGRESS, Instant.now().plus(5, ChronoUnit.MINUTES))));

        assertThatThrownBy(() -> attemptService.finishExam("attempt-1", "other"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.ATTEMPT_FORBIDDEN.getMessageFormat());
    }

    @Test
    void finishExam_alreadySubmitted_returnsExisting() {
        AttemptEntity attempt = attempt(AttemptStatus.SUBMITTED, Instant.now().plus(5, ChronoUnit.MINUTES));
        when(attemptRepository.findById("attempt-1")).thenReturn(Optional.of(attempt));
        when(attemptMapper.toDto(attempt)).thenReturn(response("attempt-1"));

        AttemptDto.AttemptResponse result = attemptService.finishExam("attempt-1", "student-1");

        assertThat(result.id()).isEqualTo("attempt-1");
        verify(attemptRepository, never()).save(any(AttemptEntity.class));
    }

    @Test
    void finishExam_success_gradesAndSubmits() {
        AttemptEntity attempt = attempt(AttemptStatus.IN_PROGRESS, Instant.now().plus(5, ChronoUnit.MINUTES));
        attempt.getQuestions().add(AttemptEntity.AttemptQuestion.builder()
                .questionId("q1").correctIndex(0).answerIndex(0).build());
        attempt.getQuestions().add(AttemptEntity.AttemptQuestion.builder()
                .questionId("q2").correctIndex(1).answerIndex(2).build());
        when(attemptRepository.findById("attempt-1")).thenReturn(Optional.of(attempt));
        when(attemptRepository.save(attempt)).thenReturn(attempt);
        when(attemptMapper.toDto(attempt)).thenReturn(response("attempt-1"));

        attemptService.finishExam("attempt-1", "student-1");

        assertThat(attempt.getStatus()).isEqualTo(AttemptStatus.SUBMITTED);
        assertThat(attempt.getTotalQuestions()).isEqualTo(2);
        assertThat(attempt.getTotalCorrect()).isEqualTo(1);
        assertThat(attempt.getScore()).isEqualTo(1);
        assertThat(attempt.getMaxScore()).isEqualTo(2);
        assertThat(attempt.getScorePercent()).isEqualTo(50);
        assertThat(attempt.getResultToken()).isNotBlank();
        assertThat(attempt.getSubmittedAt()).isNotNull();
    }

    @Test
    void finishExam_expired_setsExpiredStatus() {
        Instant expiresAt = Instant.now().minus(1, ChronoUnit.MINUTES); // Instant va ChronoUnit ishlatildi
        AttemptEntity attempt = attempt(AttemptStatus.IN_PROGRESS, expiresAt);
        when(attemptRepository.findById("attempt-1")).thenReturn(Optional.of(attempt));
        when(attemptRepository.save(attempt)).thenReturn(attempt);
        when(attemptMapper.toDto(attempt)).thenReturn(response("attempt-1"));

        attemptService.finishExam("attempt-1", "student-1");

        assertThat(attempt.getStatus()).isEqualTo(AttemptStatus.EXPIRED);
        assertThat(attempt.getSubmittedAt()).isEqualTo(expiresAt);
    }

    @Test
    void resultByToken_notFound_throws() {
        when(attemptRepository.findByResultToken("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attemptService.resultByToken("missing"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.RESULT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void resultByToken_success_returnsDetailedResult() {
        AttemptEntity attempt = attempt(AttemptStatus.SUBMITTED, Instant.now());
        attempt.setResultToken("token");
        attempt.setTotalQuestions(1);
        attempt.setTotalCorrect(1);
        attempt.setScore(1);
        attempt.setMaxScore(1);
        attempt.setScorePercent(100);
        attempt.setSubmittedAt(Instant.parse("2026-01-01T10:00:00Z"));
        attempt.getQuestions().add(AttemptEntity.AttemptQuestion.builder()
                .questionId("q1").text("2+2?").options(List.of("4", "3", "5", "6"))
                .correctIndex(0).answerIndex(0).isCorrect(true).build());
        when(attemptRepository.findByResultToken("token")).thenReturn(Optional.of(attempt));

        ResultDtoExport.ResultDto result = attemptService.resultByToken("token");

        assertThat(result.attemptId()).isEqualTo("attempt-1");
        assertThat(result.status()).isEqualTo("submitted");
        assertThat(result.totalCorrect()).isEqualTo(1);
        assertThat(result.questions()).hasSize(1);
        assertThat(result.questions().get(0).correctIndex()).isZero();
        assertThat(result.questions().get(0).isCorrect()).isTrue();
    }
}
