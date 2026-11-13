package com.example.examine.exception;

import com.example.examine.constant.ResponseType;

public class CustomBadRequestException extends RuntimeException {
    public CustomBadRequestException(ResponseType responseType) {
        super(responseType.getMessageFormat());
    }
}
