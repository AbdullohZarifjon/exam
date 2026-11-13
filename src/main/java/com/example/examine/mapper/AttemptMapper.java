package com.example.examine.mapper;

import com.example.examine.dto.AttemptDto;
import com.example.examine.entity.AttemptEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * AttemptMapper - AttemptEntity va AttemptDto lar o'rtasidagi konversiya.
 */
@Mapper(componentModel = "spring")
public interface AttemptMapper {

    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus().name().toLowerCase() : null)")
    @Mapping(target = "startedAt", expression = "java(mapDate(entity.getStartedAt()))")
    @Mapping(target = "expiresAt", expression = "java(mapDate(entity.getExpiresAt()))")
    @Mapping(target = "submittedAt", expression = "java(mapDate(entity.getSubmittedAt()))")
    AttemptDto.AttemptResponse toDto(AttemptEntity entity);

    List<AttemptDto.AttemptResponse> toDtoList(List<AttemptEntity> entities);

    default String mapDate(Instant date) {
        return date != null ? date.toString() : null;
    }
}