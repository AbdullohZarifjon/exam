package com.example.examine.service;

import com.example.examine.constant.ResponseType;
import com.example.examine.constant.UploadStatus;
import com.example.examine.dto.UploadDto;
import com.example.examine.entity.UploadEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.UploadMapper;
import com.example.examine.repository.UploadRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UploadServiceTest {

    @Mock private UploadRepository uploadRepository;
    @Mock private StorageService storageService;
    @Mock private UploadMapper uploadMapper;

    @InjectMocks
    private UploadService uploadService;

    private UploadDto.UploadRequest request(long size, String contentType) {
        return new UploadDto.UploadRequest("student", "s1", "photo.png", contentType, size);
    }

    @Test
    void request_whenTooLarge_throws() {
        assertThatThrownBy(() -> uploadService.request(request(11L * 1024 * 1024, "image/png")))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.UPLOAD_FILE_TOO_LARGE.getMessageFormat());
    }

    @Test
    void request_whenContentTypeInvalid_throws() {
        assertThatThrownBy(() -> uploadService.request(request(100, "application/pdf")))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.UPLOAD_FILE_TYPE_INVALID.getMessageFormat());
    }

    @Test
    void request_whenContentTypeNull_throws() {
        assertThatThrownBy(() -> uploadService.request(request(100, null)))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.UPLOAD_FILE_TYPE_INVALID.getMessageFormat());
    }

    @Test
    void request_success_savesPendingAndReturnsPresignedUrl() {
        UploadEntity saved = UploadEntity.builder().id("upload-1").key("uploads/x/photo.png").build();
        when(uploadRepository.save(any(UploadEntity.class))).thenReturn(saved);
        when(storageService.presignedPut(anyString(), eq("image/png"))).thenReturn("https://put");

        UploadDto.UploadResponse result = uploadService.request(request(100, "image/png"));

        assertThat(result.id()).isEqualTo("upload-1");
        assertThat(result.uploadUrl()).isEqualTo("https://put");
        assertThat(result.key()).startsWith("uploads/").endsWith("/photo.png");
        ArgumentCaptor<UploadEntity> captor = ArgumentCaptor.forClass(UploadEntity.class);
        verify(uploadRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(UploadStatus.PENDING);
        assertThat(captor.getValue().getOriginalName()).isEqualTo("photo.png");
        assertThat(captor.getValue().getKey()).isEqualTo(result.key());
    }

    @Test
    void confirm_whenMissing_throws() {
        when(uploadRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> uploadService.confirm("missing"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.UPLOAD_NOT_FOUND.getMessageFormat());
    }

    @Test
    void confirm_whenObjectMissing_throws() {
        UploadEntity upload = UploadEntity.builder().id("upload-1").key("key").build();
        when(uploadRepository.findById("upload-1")).thenReturn(Optional.of(upload));
        when(storageService.exists("key")).thenReturn(false);

        assertThatThrownBy(() -> uploadService.confirm("upload-1"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.UPLOAD_NOT_CONFIRMED.getMessageFormat());
    }

    @Test
    void confirm_success_marksConfirmedAndReturnsResponse() {
        UploadEntity upload = UploadEntity.builder().id("upload-1").key("key").build();
        UploadDto.UploadConfirmResponse mapped = new UploadDto.UploadConfirmResponse("key", "https://get");
        when(uploadRepository.findById("upload-1")).thenReturn(Optional.of(upload));
        when(storageService.exists("key")).thenReturn(true);
        when(storageService.presignedGet("key")).thenReturn("https://get");
        when(uploadMapper.toConfirmResponse(upload, "https://get")).thenReturn(mapped);

        UploadDto.UploadConfirmResponse result = uploadService.confirm("upload-1");

        assertThat(result).isEqualTo(mapped);
        assertThat(upload.getStatus()).isEqualTo(UploadStatus.CONFIRMED);
        verify(uploadRepository).save(upload);
    }

    @Test
    void imageUrl_returnsMappedResponse() {
        UploadDto.ImageUrlResponse mapped = new UploadDto.ImageUrlResponse("https://get");
        when(storageService.presignedGet("key")).thenReturn("https://get");
        when(uploadMapper.toImageUrlResponse("https://get")).thenReturn(mapped);

        assertThat(uploadService.imageUrl("key")).isEqualTo(mapped);
    }

    @Test
    void delete_whenMissing_throws() {
        when(uploadRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> uploadService.delete("missing"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.UPLOAD_NOT_FOUND.getMessageFormat());
    }

    @Test
    void delete_success_marksFailed() {
        UploadEntity upload = UploadEntity.builder().id("upload-1").key("key").build();
        when(uploadRepository.findById("upload-1")).thenReturn(Optional.of(upload));

        uploadService.delete("upload-1");

        assertThat(upload.getStatus()).isEqualTo(UploadStatus.FAILED);
        verify(uploadRepository).save(upload);
        verify(storageService, never()).presignedGet(anyString());
    }
}
