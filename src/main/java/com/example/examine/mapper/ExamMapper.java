package com.example.examine.mapper;

import com.example.examine.dto.ExamDto;
import com.example.examine.entity.ExamEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * ExamMapper - MapStruct yordamida ExamEntity va ExamDto lar orasida konversiyani bajaruvchi mapper.
 * 'componentModel = "spring"' orqali Spring konteyneriga bean sifatida qo'shiladi.
 */
@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface ExamMapper {

    /**
     * Entity ni Response DTO ga o'tkazish.
     * OffsetDateTime tiplarini String (ISO format) ga avtomatik o'tkazadi.
     */
    ExamDto.ExamResponse toDto(ExamEntity entity);

    /**
     * Entity lar ro'yxatini DTO lar ro'yxatiga o'tkazish.
     */
    List<ExamDto.ExamResponse> toDtoList(List<ExamEntity> entities);

    /**
     * CreateRequest DTO sini yangi ExamEntity ga o'tkazish.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true) // Service qatlamida DRAFT qilib belgilanadi
    @Mapping(target = "createdBy", ignore = true) // Service qatlamida userId qo'yiladi
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    ExamEntity toEntity(ExamDto.CreateExamRequest dto);

    /**
     * Mavjud Entity ni UpdateRequest DTO yordamida yangilash (Null qiymatlar e'tiborsiz qoldiriladi).
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateEntityFromDto(ExamDto.UpdateExamRequest dto, @MappingTarget ExamEntity entity);

    /**
     * OffsetDateTime ni String ko'rinishiga o'tkazish uchun helper method.
     */
    default String mapOffsetDateTime(OffsetDateTime value) {
        return value != null ? value.toString() : null;
    }
}