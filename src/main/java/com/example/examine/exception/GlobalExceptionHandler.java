package com.example.examine.exception;

import com.example.examine.constant.ResponseType;
import com.example.examine.dto.ResponseDto;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(CustomBadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ResponseDto<Object>> handleCustom(CustomBadRequestException e) {
        return ResponseEntity.badRequest().body(ResponseType.getDtoByMessage(e.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<ResponseDto<Object>> handleAccess(AccessDeniedException e) {
        return ResponseEntity.status(403).body(ResponseType.getDtoByMessage(ResponseType.ACCESS_DENIED.getMessageFormat()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ResponseDto<Object>> handleDup(DataIntegrityViolationException e) {
        return ResponseEntity.badRequest().body(ResponseType.getDtoByMessage(ResponseType.DUPLICATE_ENTRY.getMessageFormat()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ResponseDto<Object>> handleNoRes(NoResourceFoundException e) {
        return ResponseEntity.badRequest().body(ResponseType.getDtoByMessage(ResponseType.NO_RESOURCE_FOUND.getMessageFormat()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ResponseDto<Object>> handleRead(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(ResponseType.getDtoByMessage(ResponseType.MISSING_REQUEST_BODY.getMessageFormat()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ResponseDto<Object>> handleValid(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body(ResponseType.getDtoByMessage(ResponseType.VALIDATION_ERROR.getMessageFormat()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ResponseDto<Object>> handleMismatch(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.badRequest().body(ResponseType.getDtoByMessage(ResponseType.ARGUMENT_TYPE_MISMATCH.getMessageFormat()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ResponseDto<Object>> handleSize(MaxUploadSizeExceededException e) {
        return ResponseEntity.badRequest().body(ResponseType.getDtoByMessage(ResponseType.UPLOAD_FILE_TOO_LARGE.getMessageFormat()));
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ResponseDto<Object>> handleAll(Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500).body(ResponseType.getDtoByMessage(ResponseType.INTERNAL_SERVER_ERROR.getMessageFormat()));
    }
}
