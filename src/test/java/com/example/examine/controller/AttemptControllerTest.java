package com.example.examine.controller;

import com.example.examine.dto.AttemptDto;
import com.example.examine.exception.GlobalExceptionHandler;
import com.example.examine.service.AttemptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AttemptControllerTest {

    @Mock
    private AttemptService attemptService;

    @InjectMocks
    private AttemptController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private AttemptDto.AttemptResponse response() {
        return new AttemptDto.AttemptResponse("attempt-1", "exam-1", "student-1", "in_progress",
                60, null, null, null, 0, 0, 0, 0, 0, null, List.of());
    }

    @Test
    void startExam_returnsAttempt() throws Exception {
        when(attemptService.startExam("exam-1", "student-1")).thenReturn(response());

        mockMvc.perform(post("/api/v1/attempts/exam/exam-1/start")
                        .header("X-Student-Id", "student-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("attempt-1"));
    }

    @Test
    void submitAnswer_returnsOk() throws Exception {
        mockMvc.perform(post("/api/v1/attempts/attempt-1/answer")
                        .header("X-Student-Id", "student-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"q1\",\"answerIndex\":2}"))
                .andExpect(status().isOk());
    }

    @Test
    void finishExam_returnsAttempt() throws Exception {
        when(attemptService.finishExam("attempt-1", "student-1")).thenReturn(response());

        mockMvc.perform(post("/api/v1/attempts/attempt-1/finish")
                        .header("X-Student-Id", "student-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("attempt-1"));
    }
}
