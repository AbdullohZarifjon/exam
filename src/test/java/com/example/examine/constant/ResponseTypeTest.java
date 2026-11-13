package com.example.examine.constant;

import com.example.examine.dto.ResponseDto;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ResponseTypeTest {

    @Test
    void getDtoByMessage_parsesCodeAndMessage() {
        ResponseDto<Object> dto = ResponseType.getDtoByMessage("1008:exam not found");

        assertThat(dto.code()).isEqualTo(1008);
        assertThat(dto.message()).isEqualTo("exam not found");
        assertThat(dto.payload()).isNull();
    }

    @Test
    void getDtoByMessage_withoutColon_returnsEmptyMessage() {
        ResponseDto<Object> dto = ResponseType.getDtoByMessage("42");

        assertThat(dto.code()).isEqualTo(42);
        assertThat(dto.message()).isEmpty();
    }

    @Test
    void getDtoByMessage_keepsColonsInsideMessage() {
        ResponseDto<Object> dto = ResponseType.getDtoByMessage("1:some:message");

        assertThat(dto.code()).isEqualTo(1);
        assertThat(dto.message()).isEqualTo("some:message");
    }

    @Test
    void enumValues_haveExpectedMessageFormats() {
        assertThat(ResponseType.SUCCESS.getMessageFormat()).isEqualTo("0:success");
        assertThat(ResponseType.UNAUTHORIZED.getMessageFormat()).isEqualTo("8:unauthorized");
        assertThat(ResponseType.EXAM_NOT_FOUND.getMessageFormat()).isEqualTo("1008:exam not found");
        assertThat(ResponseType.BAD_REQUEST.getMessageFormat()).isEqualTo("99999:bad request");
    }
}
