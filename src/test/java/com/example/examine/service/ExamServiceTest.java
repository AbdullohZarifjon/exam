package com.example.examine.service;

import com.example.examine.constant.ExamStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.dto.ExamDto;
import com.example.examine.entity.ExamEntity;
import com.example.examine.entity.QuestionEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.ExamMapper;
import com.example.examine.repository.ExamRepository;
import com.example.examine.repository.QuestionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
class ExamServiceTest {

    @Mock private ExamRepository examRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private ExamMapper examMapper;

    @InjectMocks
    private ExamService examService;

    private ExamEntity exam(String id, ExamStatus status, String createdBy) {
        return ExamEntity.builder()
                .id(id)
                .title("Exam " + id)
                .status(status)
                .createdBy(createdBy)
                .questionsToServe(2)
                .timerMinutes(60)
                .build();
    }

    private ExamDto.ExamResponse response(String id) {
        return new ExamDto.ExamResponse(id, "Exam " + id, null, ExamStatus.DRAFT,
                60, 2, null, null, "user-1", null, null);
    }

    @Test
    void list_admin_returnsAllExams() {
        List<ExamEntity> exams = List.of(
                exam("1", ExamStatus.DRAFT, "user-1"),
                exam("2", ExamStatus.PUBLISHED, "user-2"));
        when(examRepository.findAll()).thenReturn(exams);
        when(examMapper.toDtoList(exams)).thenReturn(List.of(response("1"), response("2")));

        List<ExamDto.ExamResponse> result = examService.list(null, "user-1", "admin");

        assertThat(result).hasSize(2);
    }

    @Test
    void list_teacher_returnsPublishedAndOwned() {
        List<ExamEntity> exams = List.of(
                exam("1", ExamStatus.DRAFT, "user-1"),
                exam("2", ExamStatus.DRAFT, "user-2"),
                exam("3", ExamStatus.PUBLISHED, "user-2"));
        when(examRepository.findAll()).thenReturn(exams);
        when(examMapper.toDtoList(any())).thenReturn(List.of(response("1"), response("3")));

        List<ExamDto.ExamResponse> result = examService.list(null, "user-1", "TEACHER");

        assertThat(result).hasSize(2);
    }

    @Test
    void list_student_returnsOnlyPublished() {
        List<ExamEntity> exams = List.of(
                exam("1", ExamStatus.DRAFT, "user-1"),
                exam("2", ExamStatus.PUBLISHED, "user-2"));
        when(examRepository.findAll()).thenReturn(exams);
        when(examMapper.toDtoList(any())).thenReturn(List.of(response("2")));

        List<ExamDto.ExamResponse> result = examService.list(null, "student-1", "Student");

        assertThat(result).hasSize(1);
    }

    @Test
    void list_withStatusFilter_returnsMatchingOnly() {
        List<ExamEntity> exams = List.of(
                exam("1", ExamStatus.DRAFT, "user-1"),
                exam("2", ExamStatus.PUBLISHED, "user-1"));
        when(examRepository.findAll()).thenReturn(exams);
        when(examMapper.toDtoList(any())).thenReturn(List.of(response("2")));

        List<ExamDto.ExamResponse> result = examService.list(ExamStatus.PUBLISHED, "user-1", "admin");

        assertThat(result).hasSize(1);
    }

    @Test
    void get_whenMissing_throws() {
        when(examRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> examService.get("missing", "user-1", "ADMIN"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void get_draftNotOwnerNotAdmin_throwsForbidden() {
        when(examRepository.findById("1")).thenReturn(Optional.of(exam("1", ExamStatus.DRAFT, "user-2")));

        assertThatThrownBy(() -> examService.get("1", "user-1", "TEACHER"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_FORBIDDEN.getMessageFormat());
    }

    @Test
    void get_published_allowsAnyUser() {
        ExamEntity entity = exam("1", ExamStatus.PUBLISHED, "user-2");
        when(examRepository.findById("1")).thenReturn(Optional.of(entity));
        when(examMapper.toDto(entity)).thenReturn(response("1"));

        ExamDto.ExamResponse result = examService.get("1", "user-1", "Student");

        assertThat(result.id()).isEqualTo("1");
    }

    @Test
    void get_ownerCanSeeDraft() {
        ExamEntity entity = exam("1", ExamStatus.DRAFT, "user-1");
        when(examRepository.findById("1")).thenReturn(Optional.of(entity));
        when(examMapper.toDto(entity)).thenReturn(response("1"));

        ExamDto.ExamResponse result = examService.get("1", "user-1", "TEACHER");

        assertThat(result.id()).isEqualTo("1");
    }

    @Test
    void create_setsDraftOwnerAndDefaults() {
        ExamDto.CreateExamRequest request = new ExamDto.CreateExamRequest(
                "Title", "Desc", null, null, null, null);
        ExamEntity mapped = new ExamEntity();
        when(examMapper.toEntity(request)).thenReturn(mapped);
        when(examRepository.save(mapped)).thenReturn(mapped);
        when(examMapper.toDto(mapped)).thenReturn(response("1"));

        examService.create(request, "user-1");

        ArgumentCaptor<ExamEntity> captor = ArgumentCaptor.forClass(ExamEntity.class);
        verify(examRepository).save(captor.capture());
        ExamEntity saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(ExamStatus.DRAFT);
        assertThat(saved.getCreatedBy()).isEqualTo("user-1");
        assertThat(saved.getTimerMinutes()).isEqualTo(60);
        assertThat(saved.getQuestionsToServe()).isEqualTo(100);
    }

    @Test
    void update_whenMissing_throws() {
        when(examRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> examService.update("missing",
                new ExamDto.UpdateExamRequest(null, null, null, null, null, null), "user-1", "ADMIN"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void update_notOwner_throwsForbidden() {
        when(examRepository.findById("1")).thenReturn(Optional.of(exam("1", ExamStatus.DRAFT, "user-2")));

        assertThatThrownBy(() -> examService.update("1",
                new ExamDto.UpdateExamRequest(null, null, null, null, null, null), "user-1", "Student"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_FORBIDDEN.getMessageFormat());
    }

    @Test
    void update_success_updatesAndSaves() {
        ExamEntity entity = exam("1", ExamStatus.DRAFT, "user-1");
        ExamDto.UpdateExamRequest request = new ExamDto.UpdateExamRequest(
                "New", null, null, null, null, null);
        when(examRepository.findById("1")).thenReturn(Optional.of(entity));
        when(examRepository.save(entity)).thenReturn(entity);
        when(examMapper.toDto(entity)).thenReturn(response("1"));

        examService.update("1", request, "user-1", "TEACHER");

        verify(examMapper).updateEntityFromDto(request, entity);
        verify(examRepository).save(entity);
    }

    @Test
    void publish_whenMissing_throws() {
        when(examRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> examService.publish("missing", "user-1", "ADMIN"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void publish_whenNotDraft_throwsInvalidTransition() {
        when(examRepository.findById("1")).thenReturn(Optional.of(exam("1", ExamStatus.PUBLISHED, "user-1")));

        assertThatThrownBy(() -> examService.publish("1", "user-1", "ADMIN"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_INVALID_STATUS_TRANSITION.getMessageFormat());
    }

    @Test
    void publish_whenNotEnoughQuestions_throws() {
        ExamEntity entity = exam("1", ExamStatus.DRAFT, "user-1");
        when(examRepository.findById("1")).thenReturn(Optional.of(entity));
        when(questionRepository.findByExamId("1")).thenReturn(List.of(
                QuestionEntity.builder().id("q1").isActive(true).build()));

        assertThatThrownBy(() -> examService.publish("1", "user-1", "ADMIN"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_ENOUGH_QUESTIONS.getMessageFormat());
    }

    @Test
    void publish_success_setsPublished() {
        ExamEntity entity = exam("1", ExamStatus.DRAFT, "user-1");
        when(examRepository.findById("1")).thenReturn(Optional.of(entity));
        when(questionRepository.findByExamId("1")).thenReturn(List.of(
                QuestionEntity.builder().id("q1").isActive(true).build(),
                QuestionEntity.builder().id("q2").isActive(true).build(),
                QuestionEntity.builder().id("q3").isActive(false).build()));
        when(examRepository.save(entity)).thenReturn(entity);
        when(examMapper.toDto(entity)).thenReturn(response("1"));

        examService.publish("1", "user-1", "ADMIN");

        assertThat(entity.getStatus()).isEqualTo(ExamStatus.PUBLISHED);
        verify(examRepository).save(entity);
    }

    @Test
    void archive_whenMissing_throws() {
        when(examRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> examService.archive("missing", "user-1", "ADMIN"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void archive_whenNotPublished_throwsInvalidTransition() {
        when(examRepository.findById("1")).thenReturn(Optional.of(exam("1", ExamStatus.DRAFT, "user-1")));

        assertThatThrownBy(() -> examService.archive("1", "user-1", "ADMIN"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_INVALID_STATUS_TRANSITION.getMessageFormat());
    }

    @Test
    void archive_success_setsArchived() {
        ExamEntity entity = exam("1", ExamStatus.PUBLISHED, "user-1");
        when(examRepository.findById("1")).thenReturn(Optional.of(entity));
        when(examRepository.save(entity)).thenReturn(entity);
        when(examMapper.toDto(entity)).thenReturn(response("1"));

        examService.archive("1", "user-1", "ADMIN");

        assertThat(entity.getStatus()).isEqualTo(ExamStatus.ARCHIVED);
    }

    @Test
    void delete_whenMissing_throws() {
        when(examRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> examService.delete("missing", "user-1", "ADMIN"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_NOT_FOUND.getMessageFormat());
    }

    @Test
    void delete_notOwner_throwsForbidden() {
        when(examRepository.findById("1")).thenReturn(Optional.of(exam("1", ExamStatus.DRAFT, "user-2")));

        assertThatThrownBy(() -> examService.delete("1", "user-1", "Student"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.EXAM_FORBIDDEN.getMessageFormat());
        verify(examRepository, never()).delete(any(ExamEntity.class));
    }

    @Test
    void delete_success_deletesEntity() {
        ExamEntity entity = exam("1", ExamStatus.DRAFT, "user-1");
        when(examRepository.findById("1")).thenReturn(Optional.of(entity));

        examService.delete("1", "user-1", "TEACHER");

        verify(examRepository).delete(entity);
    }
}
