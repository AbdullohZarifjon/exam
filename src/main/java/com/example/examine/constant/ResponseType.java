package com.example.examine.constant;

import com.example.examine.dto.ResponseDto;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ResponseType {
    SUCCESS("0:success"),
    INTERNAL_SERVER_ERROR("1:internal server error"),
    NO_RESOURCE_FOUND("2:no resource found"),
    MISSING_REQUEST_BODY("3:missing request body"),
    VALIDATION_ERROR("4:validation error"),
    ARGUMENT_TYPE_MISMATCH("5:argument type mismatch"),
    DUPLICATE_ENTRY("6:duplicate entry"),
    ACCESS_DENIED("7:access denied"),
    UNAUTHORIZED("8:unauthorized"),
    USERNAME_ALREADY_USED("1001:username is already used"),
    INVALID_CREDENTIALS("1002:invalid credentials"),
    USER_NOT_FOUND("1003:user not found"),
    USER_INACTIVE("1004:user is inactive"),
    STUDENT_NOT_FOUND("1005:student not found"),
    STUDENT_CODE_ALREADY_USED("1006:student code is already used"),
    STUDENT_INACTIVE("1007:student is inactive"),
    EXAM_NOT_FOUND("1008:exam not found"),
    EXAM_NOT_PUBLISHED("1009:exam is not published"),
    EXAM_INVALID_STATUS_TRANSITION("1010:invalid exam status transition"),
    EXAM_NOT_ENOUGH_QUESTIONS("1011:not enough questions to publish"),
    EXAM_FORBIDDEN("1012:exam access forbidden"),
    QUESTION_NOT_FOUND("1013:question not found"),
    QUESTION_LOCKED("1014:question is locked for published exam"),
    QUESTION_OPTIONS_INVALID("1015:question must have exactly 4 options and at least 1 correct"),
    ATTEMPT_NOT_FOUND("1016:attempt not found"),
    ATTEMPT_EXPIRED("1017:attempt expired"),
    ATTEMPT_FORBIDDEN("1018:attempt access forbidden"),
    ATTEMPT_ALREADY_SUBMITTED("1019:attempt already submitted"),
    FACE_NOT_ENROLLED("1020:face not enrolled"),
    FACE_MATCH_FAILED("1021:face match failed"),
    FACE_AMBIGUOUS("1022:face match ambiguous"),
    FACE_LOOKALIKE("1023:face lookalike, verification required"),
    FACE_NO_FACE_DETECTED("1024:no face detected"),
    FACE_QUALITY_TOO_LOW("1025:face quality too low"),
    FACE_RATE_LIMITED("1026:face attempts rate limited"),
    FACE_SERVICE_UNAVAILABLE("1027:face service unavailable"),
    VERIFY_REQUEST_NOT_FOUND("1028:verification request not found"),
    VERIFY_REQUEST_EXPIRED("1029:verification request expired"),
    VERIFY_REQUEST_ALREADY_PENDING("1030:verification request already pending"),
    VERIFY_CLAIM_TOKEN_INVALID("1031:invalid claim token"),
    UPLOAD_NOT_FOUND("1032:upload not found"),
    UPLOAD_NOT_CONFIRMED("1033:upload not confirmed"),
    UPLOAD_FILE_TYPE_INVALID("1034:invalid file type"),
    UPLOAD_FILE_TOO_LARGE("1035:file too large"),
    RESULT_NOT_FOUND("1036:result not found"),
    NOT_IMPLEMENTED("1037:not implemented"),
    BAD_REQUEST("99999:bad request");

    private final String messageFormat;

    public static ResponseDto<Object> getDtoByMessage(String message) {
        String[] parts = message.split(":", 2);
        return new ResponseDto<>(Integer.valueOf(parts[0]), parts.length > 1 ? parts[1] : "", null);
    }
}
