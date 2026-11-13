package com.example.examine.controller;

import com.example.examine.dto.ResponseDto;
import com.example.examine.dto.upload.OkDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    @GetMapping("/health")
    public ResponseEntity<ResponseDto<OkDto>> health() {
        return ResponseEntity.ok(ResponseDto.getSuccess(new OkDto(true)));
    }
}
