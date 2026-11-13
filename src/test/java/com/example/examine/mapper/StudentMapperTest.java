package com.example.examine.mapper;

import com.example.examine.constant.FaceStatus;
import com.example.examine.dto.StudentDto;
import com.example.examine.entity.StudentEntity;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StudentMapperTest {

    private final StudentMapper mapper = Mappers.getMapper(StudentMapper.class);

    private StudentEntity sampleEntity() {
        return StudentEntity.builder()
                .id("student-1")
                .fullName("Ali Valiyev")
                .studentCode("STU-2026-1")
                .isActive(true)
                .face(StudentEntity.Face.builder().status(FaceStatus.ENROLLED).build())
                .createdAt(Instant.parse("2026-01-01T10:00:00Z"))
                .updatedAt(Instant.parse("2026-01-02T10:00:00Z"))
                .build();
    }

    @Test
    void toDto_mapsFieldsAndFaceStatus() {
        StudentDto.StudentResponse dto = mapper.toDto(sampleEntity());

        assertThat(dto.id()).isEqualTo("student-1");
        assertThat(dto.fullName()).isEqualTo("Ali Valiyev");
        assertThat(dto.studentCode()).isEqualTo("STU-2026-1");
        assertThat(dto.isActive()).isTrue();
        assertThat(dto.faceStatus()).isEqualTo("ENROLLED");
        assertThat(dto.createdAt()).isEqualTo("2026-01-01T10:00Z");
        assertThat(dto.updatedAt()).isEqualTo("2026-01-02T10:00Z");
    }

    @Test
    void toDto_handlesNullFaceAndDates() {
        StudentEntity entity = StudentEntity.builder().id("s").build();

        StudentDto.StudentResponse dto = mapper.toDto(entity);

        assertThat(dto.faceStatus()).isNull();
        assertThat(dto.createdAt()).isNull();
        assertThat(dto.updatedAt()).isNull();
    }

    @Test
    void toPublicDto_mapsOnlyPublicFields() {
        StudentDto.PublicStudentResponse dto = mapper.toPublicDto(sampleEntity());

        assertThat(dto.id()).isEqualTo("student-1");
        assertThat(dto.fullName()).isEqualTo("Ali Valiyev");
        assertThat(dto.studentCode()).isEqualTo("STU-2026-1");
        assertThat(dto.faceStatus()).isEqualTo("ENROLLED");
    }

    @Test
    void toDtoList_mapsEveryElement() {
        List<StudentDto.StudentResponse> result = mapper.toDtoList(List.of(sampleEntity(), sampleEntity()));

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(dto -> dto.id().equals("student-1"));
    }
}
