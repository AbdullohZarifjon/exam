package com.example.examine.dto;

public record ResponseDto<T>(Integer code, String message, T payload) {
    public static <T> ResponseDto<T> getSuccess(T payload) {
        return new ResponseDto<>(0, "success", payload);
    }

    public static ResponseDto<Object> getEmptySuccess() {
        return new ResponseDto<>(0, "success", null);
    }
}
