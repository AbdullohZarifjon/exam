package com.example.examine.mapper;

import com.example.examine.dto.StudentDto;
import com.example.examine.entity.StudentEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * StudentMapper - StudentEntity va StudentDto'lar orasidagi obyekt almashinuvini bajaruvchi mapper.
 */
@Mapper(componentModel = "spring")
public interface StudentMapper {

    @Mapping(target = "faceStatus", expression = "java(entity.getFaceStatus() != null ? entity.getFaceStatus().name() : null)")
    @Mapping(target = "createdAt", expression = "java(mapDate(entity.getCreatedAt()))")
    @Mapping(target = "updatedAt", expression = "java(mapDate(entity.getUpdatedAt()))")
    StudentDto.StudentResponse toDto(StudentEntity entity);

    List<StudentDto.StudentResponse> toDtoList(List<StudentEntity> entities);

    @Mapping(target = "faceStatus", expression = "java(entity.getFaceStatus() != null ? entity.getFaceStatus().name() : null)")
    StudentDto.PublicStudentResponse toPublicDto(StudentEntity entity);

    /** OffsetDateTime tipini String formatiga o'tkazish uchun yordamchi metod. */
    default String mapDate(Instant date) {
        return date != null ? date.toString() : null;
    }
}