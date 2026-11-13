package com.example.examine.mapper;

import com.example.examine.dto.QuestionDto;
import com.example.examine.entity.QuestionEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * QuestionMapper - QuestionEntity va QuestionDto lar orasida konversiya qiluvchi mapper.
 */
@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface QuestionMapper {

    /**
     * Entity ni Response DTO ga o'tkazish.
     */
    QuestionDto.QuestionResponse toDto(QuestionEntity entity);

    /**
     * Entity lar ro'yxatini DTO lar ro'yxatiga o'tkazish.
     */
    List<QuestionDto.QuestionResponse> toDtoList(List<QuestionEntity> entities);

    /**
     * CreateRequest DTO sini yangi QuestionEntity ga o'tkazish.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    QuestionEntity toEntity(QuestionDto.CreateQuestionRequest dto);

    /**
     * Mavjud Entity ni UpdateRequest DTO yordamida yangilash (Null qiymatlar e'tiborsiz qoldiriladi).
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "examId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateEntityFromDto(QuestionDto.UpdateQuestionRequest dto, @MappingTarget QuestionEntity entity);

    /**
     * OffsetDateTime ni String ko'rinishiga o'tkazish uchun helper metod.
     */
    default String mapDate(Instant date) {
        return date != null ? date.toString() : null;
    }
}