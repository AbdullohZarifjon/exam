package com.example.examine.controller;

import com.example.examine.constant.ExamStatus;
import com.example.examine.dto.ExamDto;
import com.example.examine.exception.GlobalExceptionHandler;
import com.example.examine.service.ExamService;
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
class ExamControllerTest {

    @Mock
    private ExamService examService;

    @InjectMocks
    private ExamController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private ExamDto.ExamResponse response() {
        return new ExamDto.ExamResponse("exam-1", "Java", null, ExamStatus.DRAFT,
                60, 10, null, null, "user-1", null, null);
    }

    @Test
    void list_returnsExams() throws Exception {
        when(examService.list(null, "user-1", "admin")).thenReturn(List.of(response()));

        mockMvc.perform(get("/api/v1/exams")
                        .header("X-User-Id", "user-1")
                        .header("X-User-Role", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("exam-1"));
    }

    @Test
    void get_returnsExam() throws Exception {
        when(examService.get("exam-1", "user-1", "admin")).thenReturn(response());

        mockMvc.perform(get("/api/v1/exams/exam-1")
                        .header("X-User-Id", "user-1")
                        .header("X-User-Role", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("exam-1"));
    }

    @Test
    void create_returnsCreated() throws Exception {
        when(examService.create(any(ExamDto.CreateExamRequest.class), eq("user-1"))).thenReturn(response());

        mockMvc.perform(post("/api/v1/exams")
                        .header("X-User-Id", "user-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Java\",\"timerMinutes\":60,\"questionsToServe\":10}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("exam-1"));
    }

    @Test
    void update_returnsUpdated() throws Exception {
        when(examService.update(eq("exam-1"), any(ExamDto.UpdateExamRequest.class), eq("user-1"), eq("TEACHER")))
                .thenReturn(response());

        mockMvc.perform(put("/api/v1/exams/exam-1")
                        .header("X-User-Id", "user-1")
                        .header("X-User-Role", "TEACHER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("exam-1"));
    }

    @Test
    void publish_returnsPublished() throws Exception {
        when(examService.publish("exam-1", "user-1", "TEACHER")).thenReturn(response());

        mockMvc.perform(post("/api/v1/exams/exam-1/publish")
                        .header("X-User-Id", "user-1")
                        .header("X-User-Role", "TEACHER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("exam-1"));
    }

    @Test
    void archive_returnsArchived() throws Exception {
        when(examService.archive("exam-1", "user-1", "TEACHER")).thenReturn(response());

        mockMvc.perform(post("/api/v1/exams/exam-1/archive")
                        .header("X-User-Id", "user-1")
                        .header("X-User-Role", "TEACHER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("exam-1"));
    }

    @Test
    void delete_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/exams/exam-1")
                        .header("X-User-Id", "user-1")
                        .header("X-User-Role", "TEACHER"))
                .andExpect(status().isNoContent());
    }
}
