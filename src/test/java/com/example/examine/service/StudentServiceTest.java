package com.example.examine.service;

import com.example.examine.constant.FaceStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.dto.FaceDto;
import com.example.examine.dto.StudentDto;
import com.example.examine.entity.StudentEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.StudentMapper;
import com.example.examine.repository.StudentRepository;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {

    @Mock private StudentRepository studentRepository;
    @Mock private StudentMapper studentMapper;
    @Mock private StudentCodeService studentCodeService;
    @Mock private StorageService storageService;

    @InjectMocks
    private StudentService studentService;

    private StudentEntity student(String id, String name, String code) {
        return StudentEntity.builder()
                .id(id)
                .fullName(name)
                .studentCode(code)
                .isActive(true)
                .face(StudentEntity.Face.builder().status(FaceStatus.NOT_ENROLLED).build())
                .build();
    }

    private StudentDto.StudentResponse response(String id) {
        return new StudentDto.StudentResponse(id, "Name", "STU-1", true, "NOT_ENROLLED", null, null);
    }

    @Test
    void list_withoutSearch_returnsPage() {
        List<StudentEntity> all = List.of(
                student("1", "Ali", "STU-1"),
                student("2", "Vali", "STU-2"),
                student("3", "Hasan", "STU-3"));
        when(studentRepository.findAll()).thenReturn(all);
        when(studentMapper.toDto(any(StudentEntity.class))).thenReturn(response("x"));

        StudentDto.StudentListResponse result = studentService.list(null, 1, 2);

        assertThat(result.items()).hasSize(2);
        assertThat(result.totalElements()).isEqualTo(3);
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.limit()).isEqualTo(2);
        assertThat(result.totalPages()).isEqualTo(2);
    }

    @Test
    void list_withSearch_filtersByNameOrCode() {
        List<StudentEntity> all = List.of(
                student("1", "Ali", "STU-1"),
                student("2", "Vali", "STU-2"));
        when(studentRepository.findAll()).thenReturn(all);
        when(studentMapper.toDto(any(StudentEntity.class))).thenReturn(response("x"));

        StudentDto.StudentListResponse result = studentService.list("vali", 1, 10);

        assertThat(result.items()).hasSize(1);
        assertThat(result.totalElements()).isEqualTo(1);
    }

    @Test
    void list_pageBeyondSize_returnsEmpty() {
        when(studentRepository.findAll()).thenReturn(List.of(student("1", "Ali", "STU-1")));

        StudentDto.StudentListResponse result = studentService.list(null, 5, 10);

        assertThat(result.items()).isEmpty();
        assertThat(result.totalElements()).isEqualTo(1);
    }

    @Test
    void list_zeroLimit_returnsZeroPages() {
        when(studentRepository.findAll()).thenReturn(List.of(student("1", "Ali", "STU-1")));

        StudentDto.StudentListResponse result = studentService.list(null, 1, 0);

        assertThat(result.totalPages()).isZero();
    }

    @Test
    void getById_whenMissing_throws() {
        when(studentRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studentService.getById("missing"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void getById_success_returnsMapped() {
        StudentEntity entity = student("1", "Ali", "STU-1");
        when(studentRepository.findById("1")).thenReturn(Optional.of(entity));
        when(studentMapper.toDto(entity)).thenReturn(response("1"));

        assertThat(studentService.getById("1").id()).isEqualTo("1");
    }

    @Test
    void getByCode_whenMissing_throws() {
        when(studentRepository.findByStudentCode("STU-X")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studentService.getByCode("STU-X"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void getByCode_success_returnsMapped() {
        StudentEntity entity = student("1", "Ali", "STU-1");
        when(studentRepository.findByStudentCode("STU-1")).thenReturn(Optional.of(entity));
        when(studentMapper.toDto(entity)).thenReturn(response("1"));

        assertThat(studentService.getByCode("STU-1").id()).isEqualTo("1");
    }

    @Test
    void create_withProvidedCode_savesStudent() {
        StudentDto.CreateStudentRequest request = new StudentDto.CreateStudentRequest("Ali", "STU-9");
        when(studentRepository.findByStudentCode("STU-9")).thenReturn(Optional.empty());
        when(studentRepository.save(any(StudentEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(studentMapper.toDto(any(StudentEntity.class))).thenReturn(response("1"));

        studentService.create(request);

        verify(studentRepository).save(any(StudentEntity.class));
        verify(studentCodeService, never()).generate();
    }

    @Test
    void create_withoutCode_generatesCode() {
        StudentDto.CreateStudentRequest request = new StudentDto.CreateStudentRequest("Ali", " ");
        when(studentCodeService.generate()).thenReturn("STU-2026-1");
        when(studentRepository.findByStudentCode("STU-2026-1")).thenReturn(Optional.empty());
        when(studentRepository.save(any(StudentEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(studentMapper.toDto(any(StudentEntity.class))).thenReturn(response("1"));

        studentService.create(request);

        verify(studentCodeService).generate();
    }

    @Test
    void create_duplicateCode_throws() {
        StudentDto.CreateStudentRequest request = new StudentDto.CreateStudentRequest("Ali", "STU-9");
        when(studentRepository.findByStudentCode("STU-9"))
                .thenReturn(Optional.of(student("1", "Other", "STU-9")));

        assertThatThrownBy(() -> studentService.create(request))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_CODE_ALREADY_USED.getMessageFormat());
    }

    @Test
    void update_whenMissing_throws() {
        when(studentRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studentService.update("missing",
                new StudentDto.UpdateStudentRequest("New", null), false))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void update_fullNameOnly_updatesName() {
        StudentEntity entity = student("1", "Old", "STU-1");
        when(studentRepository.findById("1")).thenReturn(Optional.of(entity));
        when(studentRepository.save(entity)).thenReturn(entity);
        when(studentMapper.toDto(entity)).thenReturn(response("1"));

        studentService.update("1", new StudentDto.UpdateStudentRequest("New", null), false);

        assertThat(entity.getFullName()).isEqualTo("New");
        assertThat(entity.getStudentCode()).isEqualTo("STU-1");
    }

    @Test
    void update_codeAsAdmin_updatesCode() {
        StudentEntity entity = student("1", "Ali", "STU-1");
        when(studentRepository.findById("1")).thenReturn(Optional.of(entity));
        when(studentRepository.findByStudentCode("STU-2")).thenReturn(Optional.empty());
        when(studentRepository.save(entity)).thenReturn(entity);
        when(studentMapper.toDto(entity)).thenReturn(response("1"));

        studentService.update("1", new StudentDto.UpdateStudentRequest(null, "STU-2"), true);

        assertThat(entity.getStudentCode()).isEqualTo("STU-2");
    }

    @Test
    void update_codeAsNonAdmin_isIgnored() {
        StudentEntity entity = student("1", "Ali", "STU-1");
        when(studentRepository.findById("1")).thenReturn(Optional.of(entity));
        when(studentRepository.save(entity)).thenReturn(entity);
        when(studentMapper.toDto(entity)).thenReturn(response("1"));

        studentService.update("1", new StudentDto.UpdateStudentRequest(null, "STU-2"), false);

        assertThat(entity.getStudentCode()).isEqualTo("STU-1");
    }

    @Test
    void update_duplicateCodeAsAdmin_throws() {
        StudentEntity entity = student("1", "Ali", "STU-1");
        when(studentRepository.findById("1")).thenReturn(Optional.of(entity));
        when(studentRepository.findByStudentCode("STU-2"))
                .thenReturn(Optional.of(student("2", "Other", "STU-2")));

        assertThatThrownBy(() -> studentService.update("1",
                new StudentDto.UpdateStudentRequest(null, "STU-2"), true))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_CODE_ALREADY_USED.getMessageFormat());
    }

    @Test
    void delete_whenMissing_throws() {
        when(studentRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studentService.delete("missing"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void delete_success_deletesEntity() {
        StudentEntity entity = student("1", "Ali", "STU-1");
        when(studentRepository.findById("1")).thenReturn(Optional.of(entity));

        studentService.delete("1");

        verify(studentRepository).delete(entity);
    }

    @Test
    void getStudentPhoto_whenMissing_throws() {
        when(studentRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studentService.getStudentPhoto("missing"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void getStudentPhoto_withKey_returnsPresignedUrl() {
        StudentEntity entity = StudentEntity.builder()
                .id("1")
                .face(StudentEntity.Face.builder().photoKey("faces/1").build())
                .build();
        when(studentRepository.findById("1")).thenReturn(Optional.of(entity));
        when(storageService.presignedGet("faces/1")).thenReturn("https://signed");

        FaceDto.FacePhotoResponse result = studentService.getStudentPhoto("1");

        assertThat(result.url()).isEqualTo("https://signed");
        assertThat(result.photoKey()).isEqualTo("faces/1");
    }

    @Test
    void getStudentPhoto_withoutKey_returnsNullUrl() {
        StudentEntity entity = StudentEntity.builder().id("1").build();
        when(studentRepository.findById("1")).thenReturn(Optional.of(entity));

        FaceDto.FacePhotoResponse result = studentService.getStudentPhoto("1");

        assertThat(result.url()).isNull();
        assertThat(result.photoKey()).isNull();
        verify(storageService, never()).presignedGet(anyString());
    }
}
