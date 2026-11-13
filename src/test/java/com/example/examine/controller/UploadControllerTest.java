package com.example.examine.controller;

import com.example.examine.dto.UploadDto;
import com.example.examine.exception.GlobalExceptionHandler;
import com.example.examine.service.UploadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UploadControllerTest {

    @Mock
    private UploadService uploadService;

    @InjectMocks
    private UploadController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void request_returnsPresignedUrl() throws Exception {
        when(uploadService.request(any(UploadDto.UploadRequest.class)))
                .thenReturn(new UploadDto.UploadResponse("u1", "https://put", "uploads/key.png"));

        mockMvc.perform(post("/api/v1/uploads/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entityType\":\"student\",\"entityId\":\"s1\",\"fileName\":\"photo.png\",\"contentType\":\"image/png\",\"sizeBytes\":100}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.id").value("u1"))
                .andExpect(jsonPath("$.payload.uploadUrl").value("https://put"));
    }

    @Test
    void confirm_returnsConfirmed() throws Exception {
        when(uploadService.confirm("u1"))
                .thenReturn(new UploadDto.UploadConfirmResponse("uploads/key.png", "https://get"));

        mockMvc.perform(post("/api/v1/uploads/u1/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.key").value("uploads/key.png"));
    }

    @Test
    void imageUrl_returnsUrl() throws Exception {
        when(uploadService.imageUrl("key")).thenReturn(new UploadDto.ImageUrlResponse("https://get"));

        mockMvc.perform(get("/api/v1/uploads/image-url").param("key", "key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.url").value("https://get"));
    }

    @Test
    void delete_returnsDeleted() throws Exception {
        mockMvc.perform(delete("/api/v1/uploads/u1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.id").value("u1"))
                .andExpect(jsonPath("$.payload.deleted").value(true));
    }
}
