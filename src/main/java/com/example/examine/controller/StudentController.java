package com.example.examine.controller;

import com.example.examine.config.security.JwtTokenDto;
import com.example.examine.dto.ResponseDto;
import com.example.examine.dto.StudentDto;
import com.example.examine.dto.upload.DeletedDto;
import com.example.examine.service.StudentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * StudentController - Talabalar bazasini boshqaruvchi REST API controller.
 * DIQQAT: Bu yerda hech qanday biznes-logika mavjud emas, barchasi StudentService'ga yuklangan.
 */
@RestController
@RequestMapping("/api/v1/auth/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    /**
     * Talabalar ro'yxatini sahifalash va qidirish orqali olish.
     * GET /api/v1/auth/students?q=&page=1&limit=20
     */
    @GetMapping
    public ResponseEntity<ResponseDto<StudentDto.StudentListResponse>> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        StudentDto.StudentListResponse response = studentService.list(q, page, limit);
        return ResponseEntity.ok(ResponseDto.getSuccess(response));
    }

    /**
     * Unikal kodi bo'yicha talabani topish.
     * GET /api/v1/auth/students/by-code/{code}
     */
    @GetMapping("/by-code/{code}")
    public ResponseEntity<ResponseDto<StudentDto.StudentResponse>> byCode(@PathVariable String code) {
        StudentDto.StudentResponse response = studentService.getByCode(code);
        return ResponseEntity.ok(ResponseDto.getSuccess(response));
    }

    /**
     * Yangi talaba qo'shish.
     * POST /api/v1/auth/students
     */
    @PostMapping
    public ResponseEntity<ResponseDto<StudentDto.StudentResponse>> create(
            @Valid @RequestBody StudentDto.CreateStudentRequest dto) {
        StudentDto.StudentResponse response = studentService.create(dto);
        return ResponseEntity.ok(ResponseDto.getSuccess(response));
    }

    /**
     * Talaba ma'lumotlarini tahrirlash (Admin tekshiruvi Controller'dan service'ga o'tkazildi).
     * PATCH /api/v1/auth/students/{id}
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ResponseDto<StudentDto.StudentResponse>> update(
            @PathVariable String id,
            @RequestBody StudentDto.UpdateStudentRequest dto,
            HttpServletRequest request) {

        JwtTokenDto jwtDto = (JwtTokenDto) request.getAttribute("jwtDto");
        boolean isAdmin = jwtDto != null && "admin".equals(jwtDto.roleName());

        StudentDto.StudentResponse response = studentService.update(id, dto, isAdmin);
        return ResponseEntity.ok(ResponseDto.getSuccess(response));
    }

    /**
     * Talabani o'chirish.
     * DELETE /api/v1/auth/students/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDto<DeletedDto>> delete(@PathVariable String id) {
        studentService.delete(id);
        return ResponseEntity.ok(ResponseDto.getSuccess(new DeletedDto(id, true)));
    }
}