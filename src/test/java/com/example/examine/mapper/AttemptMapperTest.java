package com.example.examine.mapper;

import com.example.examine.constant.AttemptStatus;
import com.example.examine.dto.AttemptDto;
import com.example.examine.entity.AttemptEntity;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AttemptMapperTest {

    private final AttemptMapper mapper = Mappers.getMapper(AttemptMapper.class);

    private AttemptEntity sampleEntity() {
        return AttemptEntity.builder()
                .id("attempt-1")
                .examId("exam-1")
                .studentId("student-1")
                .status(AttemptStatus.SUBMITTED)
                .durationMinutes(60)
                .startedAt(Instant.parse("2026-01-01T10:00:00Z"))
                .expiresAt(Instant.parse("2026-01-01T11:00:00Z"))
                .submittedAt(Instant.parse("2026-01-01T10:30:00Z"))
                .totalQuestions(2)
                .totalCorrect(1)
                .score(1)
                .maxScore(2)
                .scorePercent(50)
                .resultToken("token")
                .questions(List.of(AttemptEntity.AttemptQuestion.builder()
                        .questionId("q-1")
                        .text("2+2?")
                        .options(List.of("4", "3", "5", "6"))
                        .correctIndex(0)
                        .answerIndex(0)
                        .isCorrect(true)
                        .build()))
                .build();
    }

    @Test
    void toDto_mapsStatusAndDates() {
        AttemptDto.AttemptResponse dto = mapper.toDto(sampleEntity());

        assertThat(dto.id()).isEqualTo("attempt-1");
        assertThat(dto.examId()).isEqualTo("exam-1");
        assertThat(dto.studentId()).isEqualTo("student-1");
        assertThat(dto.status()).isEqualTo("submitted");
        assertThat(dto.durationMinutes()).isEqualTo(60);
        assertThat(dto.startedAt()).isEqualTo("2026-01-01T10:00Z");
        assertThat(dto.expiresAt()).isEqualTo("2026-01-01T11:00Z");
        assertThat(dto.submittedAt()).isEqualTo("2026-01-01T10:30Z");
        assertThat(dto.totalQuestions()).isEqualTo(2);
        assertThat(dto.totalCorrect()).isEqualTo(1);
        assertThat(dto.score()).isEqualTo(1);
        assertThat(dto.maxScore()).isEqualTo(2);
        assertThat(dto.scorePercent()).isEqualTo(50);
        assertThat(dto.resultToken()).isEqualTo("token");
    }

    @Test
    void toDto_mapsNestedQuestions() {
        AttemptDto.AttemptResponse dto = mapper.toDto(sampleEntity());

        assertThat(dto.questions()).hasSize(1);
        AttemptDto.AttemptResponse.AttemptQuestionDto question = dto.questions().get(0);
        assertThat(question.questionId()).isEqualTo("q-1");
        assertThat(question.text()).isEqualTo("2+2?");
        assertThat(question.options()).containsExactly("4", "3", "5", "6");
        assertThat(question.answerIndex()).isZero();
        assertThat(question.isCorrect()).isTrue();
    }

    @Test
    void toDto_handlesDefaultStatusAndNullDates() {
        AttemptDto.AttemptResponse dto = mapper.toDto(AttemptEntity.builder().id("a").build());

        assertThat(dto.status()).isEqualTo("in_progress");
        assertThat(dto.startedAt()).isNull();
        assertThat(dto.expiresAt()).isNull();
        assertThat(dto.submittedAt()).isNull();
    }

    @Test
    void toDtoList_mapsEveryElement() {
        List<AttemptDto.AttemptResponse> result = mapper.toDtoList(List.of(sampleEntity(), sampleEntity()));

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(dto -> dto.id().equals("attempt-1"));
    }
}
