package com.example.examine.mapper;

import com.example.examine.dto.QuestionDto;
import com.example.examine.entity.QuestionEntity;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class QuestionMapperTest {

    private final QuestionMapper mapper = Mappers.getMapper(QuestionMapper.class);

    private QuestionEntity sampleEntity() {
        return QuestionEntity.builder()
                .id("q-1")
                .examId("exam-1")
                .text("2+2?")
                .options(List.of("4", "3", "5", "6"))
                .explanation("because")
                .imageUrl("img")
                .isActive(true)
                .createdAt(Instant.parse("2026-01-01T10:00:00Z"))
                .updatedAt(Instant.parse("2026-01-02T10:00:00Z"))
                .build();
    }

    @Test
    void toDto_mapsAllFields() {
        QuestionDto.QuestionResponse dto = mapper.toDto(sampleEntity());

        assertThat(dto.id()).isEqualTo("q-1");
        assertThat(dto.examId()).isEqualTo("exam-1");
        assertThat(dto.text()).isEqualTo("2+2?");
        assertThat(dto.options()).containsExactly("4", "3", "5", "6");
        assertThat(dto.explanation()).isEqualTo("because");
        assertThat(dto.imageUrl()).isEqualTo("img");
        assertThat(dto.isActive()).isTrue();
        assertThat(dto.createdAt()).isEqualTo("2026-01-01T10:00Z");
        assertThat(dto.updatedAt()).isEqualTo("2026-01-02T10:00Z");
    }

    @Test
    void toDto_handlesNullDates() {
        QuestionDto.QuestionResponse dto = mapper.toDto(QuestionEntity.builder().id("q").build());

        assertThat(dto.createdAt()).isNull();
        assertThat(dto.updatedAt()).isNull();
    }

    @Test
    void toDtoList_mapsEveryElement() {
        List<QuestionDto.QuestionResponse> result = mapper.toDtoList(List.of(sampleEntity(), sampleEntity()));

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(dto -> dto.id().equals("q-1"));
    }

    @Test
    void toEntity_mapsRequestAndIgnoresManagedFields() {
        QuestionDto.CreateQuestionRequest request = new QuestionDto.CreateQuestionRequest(
                "exam-1", "text", List.of("a", "b", "c", "d"), "exp", "img", false);

        QuestionEntity entity = mapper.toEntity(request);

        assertThat(entity.getExamId()).isEqualTo("exam-1");
        assertThat(entity.getText()).isEqualTo("text");
        assertThat(entity.getOptions()).containsExactly("a", "b", "c", "d");
        assertThat(entity.getExplanation()).isEqualTo("exp");
        assertThat(entity.getImageUrl()).isEqualTo("img");
        assertThat(entity.getIsActive()).isFalse();
        assertThat(entity.getId()).isNull();
        assertThat(entity.getCreatedAt()).isNull();
        assertThat(entity.getUpdatedAt()).isNull();
    }

    @Test
    void updateEntityFromDto_ignoresNullsAndExamId() {
        QuestionEntity entity = sampleEntity();
        QuestionDto.UpdateQuestionRequest request = new QuestionDto.UpdateQuestionRequest(
                "new text", null, null, null, null);

        mapper.updateEntityFromDto(request, entity);

        assertThat(entity.getText()).isEqualTo("new text");
        assertThat(entity.getExamId()).isEqualTo("exam-1");
        assertThat(entity.getOptions()).containsExactly("4", "3", "5", "6");
        assertThat(entity.getExplanation()).isEqualTo("because");
    }
}
