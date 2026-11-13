package com.example.examine.controller;

import com.example.examine.dto.QuestionDto;
import com.example.examine.exception.GlobalExceptionHandler;
import com.example.examine.service.QuestionService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class QuestionControllerTest {

    @Mock
    private QuestionService questionService;

    @InjectMocks
    private QuestionController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private QuestionDto.QuestionResponse response() {
        return new QuestionDto.QuestionResponse("q1", "exam-1", "2+2?",
                List.of("4", "3", "5", "6"), null, null, true, null, null);
    }

    @Test
    void list_returnsQuestions() throws Exception {
        when(questionService.list("exam-1")).thenReturn(List.of(response()));

        mockMvc.perform(get("/api/v1/questions/exam/exam-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("q1"));
    }

    @Test
    void get_returnsQuestion() throws Exception {
        when(questionService.get("q1")).thenReturn(response());

        mockMvc.perform(get("/api/v1/questions/q1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("q1"));
    }

    @Test
    void create_returnsCreated() throws Exception {
        when(questionService.create(any(QuestionDto.CreateQuestionRequest.class))).thenReturn(response());

        mockMvc.perform(post("/api/v1/questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"examId\":\"exam-1\",\"text\":\"2+2?\",\"options\":[\"4\",\"3\",\"5\",\"6\"]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("q1"));
    }

    @Test
    void update_returnsUpdated() throws Exception {
        when(questionService.update(eq("q1"), any(QuestionDto.UpdateQuestionRequest.class))).thenReturn(response());

        mockMvc.perform(put("/api/v1/questions/q1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"new\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("q1"));
    }

    @Test
    void delete_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/questions/q1"))
                .andExpect(status().isNoContent());
    }
}
