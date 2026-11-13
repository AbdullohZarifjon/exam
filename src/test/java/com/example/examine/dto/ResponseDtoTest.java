package com.example.examine.dto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ResponseDtoTest {

    @Test
    void getSuccess_wrapsPayloadWithZeroCode() {
        ResponseDto<String> dto = ResponseDto.getSuccess("payload");

        assertThat(dto.code()).isZero();
        assertThat(dto.message()).isEqualTo("success");
        assertThat(dto.payload()).isEqualTo("payload");
    }

    @Test
    void getEmptySuccess_hasNullPayload() {
        ResponseDto<Object> dto = ResponseDto.getEmptySuccess();

        assertThat(dto.code()).isZero();
        assertThat(dto.message()).isEqualTo("success");
        assertThat(dto.payload()).isNull();
    }
}
