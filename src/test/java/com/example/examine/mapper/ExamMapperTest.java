package com.example.examine.mapper;

import com.example.examine.constant.ExamStatus;
import com.example.examine.dto.ExamDto;
import com.example.examine.entity.ExamEntity;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ExamMapperTest {

    private final ExamMapper mapper = Mappers.getMapper(ExamMapper.class);

    private ExamEntity sampleEntity() {
        return ExamEntity.builder()
                .id("exam-1")
                .title("Java")
                .description("desc")
                .status(ExamStatus.PUBLISHED)
                .timerMinutes(60)
                .questionsToServe(10)
                .passingScorePercent(60)
                .passingScorePoints(6)
                .createdBy("user-1")
                .createdAt(Instant.parse("2026-01-01T10:00:00Z"))
                .updatedAt(Instant.parse("2026-01-02T10:00:00Z"))
                .build();
    }

    @Test
    void toDto_mapsAllFieldsAndDates() {
        ExamDto.ExamResponse dto = mapper.toDto(sampleEntity());

        assertThat(dto.id()).isEqualTo("exam-1");
        assertThat(dto.title()).isEqualTo("Java");
        assertThat(dto.description()).isEqualTo("desc");
        assertThat(dto.status()).isEqualTo(ExamStatus.PUBLISHED);
        assertThat(dto.timerMinutes()).isEqualTo(60);
        assertThat(dto.questionsToServe()).isEqualTo(10);
        assertThat(dto.passingScorePercent()).isEqualTo(60);
        assertThat(dto.passingScorePoints()).isEqualTo(6);
        assertThat(dto.createdBy()).isEqualTo("user-1");
        assertThat(dto.createdAt()).isEqualTo("2026-01-01T10:00Z");
        assertThat(dto.updatedAt()).isEqualTo("2026-01-02T10:00Z");
    }

    @Test
    void toDto_handlesNullDates() {
        ExamEntity entity = ExamEntity.builder().id("e").build();

        ExamDto.ExamResponse dto = mapper.toDto(entity);

        assertThat(dto.createdAt()).isNull();
        assertThat(dto.updatedAt()).isNull();
    }

    @Test
    void toDtoList_mapsEveryElement() {
        List<ExamDto.ExamResponse> result = mapper.toDtoList(List.of(sampleEntity(), sampleEntity()));

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(dto -> dto.id().equals("exam-1"));
    }

    @Test
    void toEntity_mapsRequestAndIgnoresManagedFields() {
        ExamDto.CreateExamRequest request = new ExamDto.CreateExamRequest(
                "Title", "Desc", 30, 5, 50, 5);

        ExamEntity entity = mapper.toEntity(request);

        assertThat(entity.getTitle()).isEqualTo("Title");
        assertThat(entity.getDescription()).isEqualTo("Desc");
        assertThat(entity.getTimerMinutes()).isEqualTo(30);
        assertThat(entity.getQuestionsToServe()).isEqualTo(5);
        assertThat(entity.getPassingScorePercent()).isEqualTo(50);
        assertThat(entity.getPassingScorePoints()).isEqualTo(5);
        assertThat(entity.getId()).isNull();
        assertThat(entity.getCreatedBy()).isNull();
        assertThat(entity.getCreatedAt()).isNull();
        assertThat(entity.getUpdatedAt()).isNull();
    }

    @Test
    void updateEntityFromDto_ignoresNullValues() {
        ExamEntity entity = sampleEntity();
        ExamDto.UpdateExamRequest request = new ExamDto.UpdateExamRequest(
                "New title", null, null, null, null, null);

        mapper.updateEntityFromDto(request, entity);

        assertThat(entity.getTitle()).isEqualTo("New title");
        assertThat(entity.getDescription()).isEqualTo("desc");
        assertThat(entity.getTimerMinutes()).isEqualTo(60);
        assertThat(entity.getStatus()).isEqualTo(ExamStatus.PUBLISHED);
        assertThat(entity.getCreatedBy()).isEqualTo("user-1");
    }
}
