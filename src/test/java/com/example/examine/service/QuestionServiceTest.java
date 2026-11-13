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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuestionServiceTest {

    @Mock private QuestionRepository questionRepository;
    @Mock private ExamRepository examRepository;
    @Mock private QuestionMapper questionMapper;

    @InjectMocks
    private QuestionService questionService;

    private ExamEntity exam(ExamStatus status) {
        return ExamEntity.builder().id("exam-1").status(status).build();
    }

    private QuestionEntity question() {
        return QuestionEntity.builder()
                .id("q-1")
                .examId("exam-1")
                .text("2+2?")
                .options(List.of("4", "3", "5", "6"))
                .isActive(true)
                .build();
    }

    private QuestionDto.QuestionResponse response(String id) {
        return new QuestionDto.QuestionResponse(id, "exam-1", "2+2?",
                List.of("4", "3", "5", "6"), null, null, true, null, null);
    }

    @Test
    void list_whenExamMissing_throws() {
        when(examRepository.existsById("missing")).thenReturn(false);

        assertThatThrownBy(() -> questionService.list("missing"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void list_success_returnsMappedQuestions() {
        List<QuestionEntity> questions = List.of(question());
        when(examRepository.existsById("exam-1")).thenReturn(true);
        when(questionRepository.findByExamId("exam-1")).thenReturn(questions);
        when(questionMapper.toDtoList(questions)).thenReturn(List.of(response("q-1")));

        List<QuestionDto.QuestionResponse> result = questionService.list("exam-1");

        assertThat(result).hasSize(1);
    }

    @Test
    void get_whenMissing_throws() {
        when(questionRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.get("missing"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.QUESTION_NOT_FOUND.getMessageFormat());
    }

    @Test
    void get_success_returnsMapped() {
        QuestionEntity entity = question();
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(entity));
        when(questionMapper.toDto(entity)).thenReturn(response("q-1"));

        assertThat(questionService.get("q-1").id()).isEqualTo("q-1");
    }

    @Test
    void create_whenExamMissing_throws() {
        QuestionDto.CreateQuestionRequest request = new QuestionDto.CreateQuestionRequest(
                "missing", "text", List.of("a", "b", "c", "d"), null, null, null);
        when(examRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.create(request))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void create_whenExamNotDraft_throwsLocked() {
        QuestionDto.CreateQuestionRequest request = new QuestionDto.CreateQuestionRequest(
                "exam-1", "text", List.of("a", "b", "c", "d"), null, null, null);
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));

        assertThatThrownBy(() -> questionService.create(request))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.QUESTION_LOCKED.getMessageFormat());
    }

    @Test
    void create_success_defaultsActiveAndSaves() {
        QuestionDto.CreateQuestionRequest request = new QuestionDto.CreateQuestionRequest(
                "exam-1", "text", List.of("a", "b", "c", "d"), null, null, null);
        QuestionEntity mapped = QuestionEntity.builder().examId("exam-1").text("text").build();
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.DRAFT)));
        when(questionMapper.toEntity(request)).thenReturn(mapped);
        when(questionRepository.save(mapped)).thenReturn(mapped);
        when(questionMapper.toDto(mapped)).thenReturn(response("q-1"));

        questionService.create(request);

        assertThat(mapped.getIsActive()).isTrue();
        verify(questionRepository).save(mapped);
    }

    @Test
    void update_whenQuestionMissing_throws() {
        when(questionRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.update("missing",
                new QuestionDto.UpdateQuestionRequest(null, null, null, null, null)))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.QUESTION_NOT_FOUND.getMessageFormat());
    }

    @Test
    void update_whenExamMissing_throws() {
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(question()));
        when(examRepository.findById("exam-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.update("q-1",
                new QuestionDto.UpdateQuestionRequest(null, null, null, null, null)))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void update_whenExamNotDraft_throwsLocked() {
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(question()));
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.ARCHIVED)));

        assertThatThrownBy(() -> questionService.update("q-1",
                new QuestionDto.UpdateQuestionRequest(null, null, null, null, null)))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.QUESTION_LOCKED.getMessageFormat());
    }

    @Test
    void update_success_updatesAndSaves() {
        QuestionEntity entity = question();
        QuestionDto.UpdateQuestionRequest request = new QuestionDto.UpdateQuestionRequest(
                "new", null, null, null, null);
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(entity));
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.DRAFT)));
        when(questionRepository.save(entity)).thenReturn(entity);
        when(questionMapper.toDto(entity)).thenReturn(response("q-1"));

        questionService.update("q-1", request);

        verify(questionMapper).updateEntityFromDto(request, entity);
        verify(questionRepository).save(entity);
    }

    @Test
    void delete_whenQuestionMissing_throws() {
        when(questionRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.delete("missing"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.QUESTION_NOT_FOUND.getMessageFormat());
    }

    @Test
    void delete_whenExamMissing_throws() {
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(question()));
        when(examRepository.findById("exam-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> questionService.delete("q-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void delete_whenExamNotDraft_throwsLocked() {
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(question()));
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.PUBLISHED)));

        assertThatThrownBy(() -> questionService.delete("q-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.QUESTION_LOCKED.getMessageFormat());
        verify(questionRepository, never()).delete(any(QuestionEntity.class));
    }

    @Test
    void delete_success_deletesEntity() {
        QuestionEntity entity = question();
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(entity));
        when(examRepository.findById("exam-1")).thenReturn(Optional.of(exam(ExamStatus.DRAFT)));

        questionService.delete("q-1");

        verify(questionRepository).delete(entity);
    }
}
