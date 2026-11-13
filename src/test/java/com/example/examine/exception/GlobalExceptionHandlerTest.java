package com.example.examine.exception;

import com.example.examine.constant.ResponseType;
import com.example.examine.dto.ResponseDto;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleCustom_returnsBadRequestWithParsedCode() {
        ResponseEntity<ResponseDto<Object>> response =
                handler.handleCustom(new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(1008);
        assertThat(response.getBody().message()).isEqualTo("exam not found");
    }

    @Test
    void handleAccess_returnsForbidden() {
        ResponseEntity<ResponseDto<Object>> response =
                handler.handleAccess(new AccessDeniedException("denied"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(7);
    }

    @Test
    void handleDup_returnsBadRequest() {
        ResponseEntity<ResponseDto<Object>> response =
                handler.handleDup(new DataIntegrityViolationException("dup"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(6);
    }

    @Test
    void handleNoRes_returnsBadRequest() {
        ResponseEntity<ResponseDto<Object>> response =
                handler.handleNoRes(new NoResourceFoundException(HttpMethod.GET, "/missing", "not found"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(2);
    }

    @Test
    void handleRead_returnsBadRequest() {
        ResponseEntity<ResponseDto<Object>> response =
                handler.handleRead(mock(HttpMessageNotReadableException.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(3);
    }

    @Test
    void handleValid_returnsBadRequest() {
        ResponseEntity<ResponseDto<Object>> response =
                handler.handleValid(mock(MethodArgumentNotValidException.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(4);
    }

    @Test
    void handleMismatch_returnsBadRequest() {
        ResponseEntity<ResponseDto<Object>> response =
                handler.handleMismatch(mock(MethodArgumentTypeMismatchException.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(5);
    }

    @Test
    void handleSize_returnsBadRequest() {
        ResponseEntity<ResponseDto<Object>> response =
                handler.handleSize(new MaxUploadSizeExceededException(1024L));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(1035);
    }

    @Test
    void handleAll_returnsInternalServerError() {
        ResponseEntity<ResponseDto<Object>> response =
                handler.handleAll(new RuntimeException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(1);
    }
}
