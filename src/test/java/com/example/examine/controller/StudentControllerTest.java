package com.example.examine.controller;

import com.example.examine.config.security.JwtTokenDto;
import com.example.examine.dto.StudentDto;
import com.example.examine.exception.GlobalExceptionHandler;
import com.example.examine.service.StudentService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StudentControllerTest {

    @Mock
    private StudentService studentService;

    @InjectMocks
    private StudentController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private StudentDto.StudentResponse response() {
        return new StudentDto.StudentResponse("s1", "Ali", "STU-1", true, "NOT_ENROLLED", null, null);
    }

    @Test
    void list_returnsPage() throws Exception {
        when(studentService.list(null, 1, 20)).thenReturn(
                new StudentDto.StudentListResponse(List.of(response()), 1, 1, 20, 1));

        mockMvc.perform(get("/api/v1/auth/students"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.items[0].id").value("s1"))
                .andExpect(jsonPath("$.payload.totalElements").value(1));
    }

    @Test
    void byCode_returnsStudent() throws Exception {
        when(studentService.getByCode("STU-1")).thenReturn(response());

        mockMvc.perform(get("/api/v1/auth/students/by-code/STU-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.studentCode").value("STU-1"));
    }

    @Test
    void create_returnsStudent() throws Exception {
        when(studentService.create(any(StudentDto.CreateStudentRequest.class))).thenReturn(response());

        mockMvc.perform(post("/api/v1/auth/students")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Ali\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.id").value("s1"));
    }

    @Test
    void update_withAdminJwt_passesAdminFlag() throws Exception {
        JwtTokenDto jwtDto = new JwtTokenDto("user-1", "admin", "admin", "User", null, 0);
        when(studentService.update(eq("s1"), any(StudentDto.UpdateStudentRequest.class), eq(true)))
                .thenReturn(response());

        mockMvc.perform(patch("/api/v1/auth/students/s1")
                        .requestAttr("jwtDto", jwtDto)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"New\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.id").value("s1"));
    }

    @Test
    void update_withoutJwt_passesNonAdminFlag() throws Exception {
        when(studentService.update(eq("s1"), any(StudentDto.UpdateStudentRequest.class), eq(false)))
                .thenReturn(response());

        mockMvc.perform(patch("/api/v1/auth/students/s1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"New\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.id").value("s1"));
    }

    @Test
    void delete_returnsDeleted() throws Exception {
        mockMvc.perform(delete("/api/v1/auth/students/s1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.id").value("s1"))
                .andExpect(jsonPath("$.payload.deleted").value(true));
    }
}
