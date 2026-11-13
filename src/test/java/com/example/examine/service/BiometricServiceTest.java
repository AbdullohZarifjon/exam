package com.example.examine.service;

import com.example.examine.constant.FaceStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.entity.BiometricEventEntity;
import com.example.examine.entity.StudentEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.repository.BiometricEventRepository;
import com.example.examine.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiometricServiceTest {

    @Mock private FaceService faceService;
    @Mock private StudentRepository studentRepository;
    @Mock private BiometricEventRepository biometricEventRepository;

    @InjectMocks
    private BiometricService biometricService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(biometricService, "matchThreshold", 0.60);
        ReflectionTestUtils.setField(biometricService, "gapThreshold", 0.08);
    }

    private StudentEntity student(String id) {
        return StudentEntity.builder()
                .id(id)
                .fullName("Student " + id)
                .face(StudentEntity.Face.builder().status(FaceStatus.NOT_ENROLLED).build())
                .build();
    }

    private List<Double> embedding(int size) {
        return Collections.nCopies(size, 0.1);
    }

    @Test
    void enrollStudent_whenMissing_throws() {
        when(studentRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> biometricService.enrollStudent("missing", "img", "staff"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void enrollStudent_whenNoFaceDetected_throws() {
        when(studentRepository.findById("s1")).thenReturn(Optional.of(student("s1")));
        when(faceService.embed("img")).thenReturn(Map.of(
                "quality", 0.9, "model", "buffalo_s", "faceCount", 0, "embedding", embedding(512)));

        assertThatThrownBy(() -> biometricService.enrollStudent("s1", "img", "staff"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_NO_FACE_DETECTED.getMessageFormat());
    }

    @Test
    void enrollStudent_whenQualityLow_throws() {
        when(studentRepository.findById("s1")).thenReturn(Optional.of(student("s1")));
        when(faceService.embed("img")).thenReturn(Map.of(
                "quality", 0.1, "model", "buffalo_s", "faceCount", 1, "embedding", embedding(512)));

        assertThatThrownBy(() -> biometricService.enrollStudent("s1", "img", "staff"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_QUALITY_TOO_LOW.getMessageFormat());
    }

    @Test
    void enrollStudent_whenEmbeddingWrongSize_throws() {
        when(studentRepository.findById("s1")).thenReturn(Optional.of(student("s1")));
        when(faceService.embed("img")).thenReturn(Map.of(
                "quality", 0.9, "model", "buffalo_s", "faceCount", 1, "embedding", embedding(10)));

        assertThatThrownBy(() -> biometricService.enrollStudent("s1", "img", "staff"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_NO_FACE_DETECTED.getMessageFormat());
    }

    @Test
    void enrollStudent_success_persistsFaceDataAndLogs() {
        StudentEntity entity = student("s1");
        List<Double> vector = embedding(512);
        when(studentRepository.findById("s1")).thenReturn(Optional.of(entity));
        when(faceService.embed("img")).thenReturn(Map.of(
                "quality", 0.9, "model", "buffalo_s", "faceCount", 1, "embedding", vector));

        BiometricService.EnrollResult result = biometricService.enrollStudent("s1", "img", "staff");

        assertThat(result.quality()).isEqualTo(0.9);
        assertThat(result.model()).isEqualTo("buffalo_s");
        assertThat(entity.getFaceStatus()).isEqualTo(FaceStatus.ENROLLED);
        assertThat(entity.getFaceEmbedding()).hasSize(512);
        assertThat(entity.getFacePhotoKey()).isEqualTo("faces/s1");
        assertThat(entity.getFaceEnrolledBy()).isEqualTo("staff");
        verify(faceService).enrollEmbedding("s1", vector);
        verify(studentRepository).save(entity);
        verify(biometricEventRepository).save(any(BiometricEventEntity.class));
    }

    @Test
    void revokeStudent_whenMissing_throws() {
        when(studentRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> biometricService.revokeStudent("missing", "ip"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.STUDENT_NOT_FOUND.getMessageFormat());
    }

    @Test
    void revokeStudent_success_clearsFaceAndDeletesRemote() {
        StudentEntity entity = student("s1");
        entity.setFaceStatus(FaceStatus.ENROLLED);
        entity.setFaceEmbedding(new double[]{1.0});
        when(studentRepository.findById("s1")).thenReturn(Optional.of(entity));

        Map<String, Object> result = biometricService.revokeStudent("s1", "ip");

        assertThat(result).containsEntry("ok", true);
        assertThat(entity.getFaceStatus()).isEqualTo(FaceStatus.NOT_ENROLLED);
        assertThat(entity.getFaceEmbedding()).isNull();
        verify(faceService).deleteStudent("s1");
        verify(studentRepository).save(entity);
        verify(biometricEventRepository).save(any(BiometricEventEntity.class));
    }

    @Test
    void localIdentify_withNoEnrolledStudents_returnsEmptyResult() {
        when(studentRepository.findAll()).thenReturn(List.of());

        Map<String, Object> result = biometricService.localIdentify(List.of(1.0, 0.0));

        assertThat(result).containsEntry("studentId", "");
        assertThat(result).containsEntry("model", "local");
        assertThat((List<?>) result.get("candidates")).isEmpty();
    }

    @Test
    void localIdentify_returnsBestCandidateAndGap() {
        StudentEntity first = student("s1");
        first.setFaceEmbedding(new double[]{1.0, 0.0});
        StudentEntity second = student("s2");
        second.setFaceEmbedding(new double[]{0.0, 1.0});
        when(studentRepository.findAll()).thenReturn(List.of(first, second));

        Map<String, Object> result = biometricService.localIdentify(List.of(1.0, 0.0));

        assertThat(result).containsEntry("studentId", "s1");
        assertThat((Double) result.get("score")).isCloseTo(1.0, org.assertj.core.data.Offset.offset(1e-6));
        assertThat((Double) result.get("gap")).isCloseTo(1.0, org.assertj.core.data.Offset.offset(1e-6));
        assertThat((List<?>) result.get("candidates")).hasSize(2);
    }

    @Test
    void logBiometricEvent_savesEntity() {
        StudentEntity entity = student("s1");

        biometricService.logBiometricEvent(entity, "exam-1", "attempt-1", "identify",
                0.9, 0.2, "buffalo_s", "detail");

        ArgumentCaptor<BiometricEventEntity> captor = ArgumentCaptor.forClass(BiometricEventEntity.class);
        verify(biometricEventRepository).save(captor.capture());
        BiometricEventEntity saved = captor.getValue();
        assertThat(saved.getStudentId()).isEqualTo("s1");
        assertThat(saved.getExamId()).isEqualTo("exam-1");
        assertThat(saved.getAttemptId()).isEqualTo("attempt-1");
        assertThat(saved.getEvent()).isEqualTo("identify");
        assertThat(saved.getScore()).isEqualTo(0.9);
        assertThat(saved.getGap()).isEqualTo(0.2);
        assertThat(saved.getModel()).isEqualTo("buffalo_s");
        assertThat(saved.getDetail()).isEqualTo("detail");
    }

    @Test
    void logBiometricEvent_withNullStudent_savesNullStudentId() {
        biometricService.logBiometricEvent(null, "exam-1", null, "fail", null, null, null, "no-candidate");

        ArgumentCaptor<BiometricEventEntity> captor = ArgumentCaptor.forClass(BiometricEventEntity.class);
        verify(biometricEventRepository).save(captor.capture());
        assertThat(captor.getValue().getStudentId()).isNull();
    }

    @Test
    void recentEvents_returnsPageContent() {
        BiometricEventEntity event = BiometricEventEntity.builder().id("e1").build();
        when(biometricEventRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(event)));

        List<BiometricEventEntity> result = biometricService.recentEvents(10);

        assertThat(result).containsExactly(event);
    }
}
