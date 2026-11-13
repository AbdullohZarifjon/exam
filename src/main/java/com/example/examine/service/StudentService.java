package com.example.examine.service;

import com.example.examine.constant.FaceStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.dto.FaceDto;
import com.example.examine.dto.StudentDto;
import com.example.examine.entity.StudentEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.StudentMapper;
import com.example.examine.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * StudentService - Talabalar bazasini boshqarish, sahifalash, qidirish,
 * yangi talaba qo'shish va tahrirlash kabi barcha biznes-logikani bajaruvchi servis.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class StudentService {

    private final StudentRepository studentRepository;
    private final StudentMapper studentMapper;
    private final StudentCodeService studentCodeService;
    private final StorageService storageService;

    /**
     * 1. Talabalar ro'yxatini qidirish va sahifalash (Pagination & Filtering) orqali olish.
     *
     * @param searchQuery Qidiruv matni (F.I.O. yoki studentCode bo'yicha)
     * @param page        Joriy sahifa raqami
     * @param limit       Har bir sahifadagi elementlar soni
     */
    @Transactional(readOnly = true)
    public StudentDto.StudentListResponse list(String searchQuery, int page, int limit) {
        List<StudentEntity> allStudents = studentRepository.findAll();

        // Qidiruv so'rovi bo'lsa filtrlash
        List<StudentEntity> filteredStudents = (searchQuery == null || searchQuery.isBlank())
                ? allStudents
                : allStudents.stream()
                .filter(s -> s.getFullName().toLowerCase().contains(searchQuery.toLowerCase())
                        || s.getStudentCode().toLowerCase().contains(searchQuery.toLowerCase()))
                .toList();

        // Sahifalash (Pagination) hisob-kitobi
        int fromIndex = Math.min((page - 1) * limit, filteredStudents.size());
        int toIndex = Math.min(fromIndex + limit, filteredStudents.size());

        List<StudentDto.StudentResponse> pageItems = filteredStudents.subList(fromIndex, toIndex).stream()
                .map(studentMapper::toDto)
                .toList();

        int totalPages = (limit == 0) ? 0 : (int) Math.ceil((double) filteredStudents.size() / limit);

        return new StudentDto.StudentListResponse(pageItems, filteredStudents.size(), page, limit, totalPages);
    }

    /**
     * 2. ID bo'yicha bitta talabani topish.
     */
    @Transactional(readOnly = true)
    public StudentDto.StudentResponse getById(String id) {
        StudentEntity student = studentRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));
        return studentMapper.toDto(student);
    }

    /**
     * 3. Unikal kodi (studentCode) bo'yicha talabani topish.
     */
    @Transactional(readOnly = true)
    public StudentDto.StudentResponse getByCode(String code) {
        StudentEntity student = studentRepository.findByStudentCode(code)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));
        return studentMapper.toDto(student);
    }

    /**
     * 4. Yangi talaba yaratish (Agar kodi bo'lmasa avtomatik generatsiya qilinadi).
     */
    public StudentDto.StudentResponse create(StudentDto.CreateStudentRequest dto) {
        String code = dto.studentCode();
        if (code == null || code.isBlank()) {
            code = studentCodeService.generate();
        }

        if (studentRepository.findByStudentCode(code).isPresent()) {
            throw new CustomBadRequestException(ResponseType.STUDENT_CODE_ALREADY_USED);
        }

        StudentEntity newStudent = StudentEntity.builder()
                .fullName(dto.fullName())
                .studentCode(code)
                .isActive(true)
                .tokenVersion(0)
                .face(StudentEntity.Face.builder().status(FaceStatus.NOT_ENROLLED).build())
                .build();

        StudentEntity savedStudent = studentRepository.save(newStudent);
        return studentMapper.toDto(savedStudent);
    }

    /**
     * 5. Talaba ma'lumotlarini tahrirlash (Admin kodi o'zgartira oladi, oddiy foydalanuvchi faqat F.I.O.).
     */
    public StudentDto.StudentResponse update(String id, StudentDto.UpdateStudentRequest dto, boolean isAdmin) {
        StudentEntity student = studentRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));

        if (dto.fullName() != null && !dto.fullName().isBlank()) {
            student.setFullName(dto.fullName());
        }

        // Faqat Admin kiritgan bo'lsagina studentCode ni o'zgartirishga ruxsat beramiz
        if (dto.studentCode() != null && !dto.studentCode().isBlank() && isAdmin) {
            boolean codeExists = studentRepository.findByStudentCode(dto.studentCode())
                    .filter(existing -> !existing.getId().equals(id))
                    .isPresent();
            if (codeExists) {
                throw new CustomBadRequestException(ResponseType.STUDENT_CODE_ALREADY_USED);
            }
            student.setStudentCode(dto.studentCode());
        }

        StudentEntity savedStudent = studentRepository.save(student);
        return studentMapper.toDto(savedStudent);
    }

    /**
     * 6. Talabani bazadan o'chirish.
     */
    public void delete(String id) {
        StudentEntity student = studentRepository.findById(id)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));
        studentRepository.delete(student);
    }

    /**
     * Talabaning ID si bo'yicha uning yuz rasmi havolasini (presigned URL) olish.
     *
     * @param studentId Talaba ID si
     * @return FacePhotoResponse Rasm URL manzili va S3 key'i
     */
    @Transactional(readOnly = true)
    public FaceDto.FacePhotoResponse getStudentPhoto(String studentId) {
        StudentEntity student = studentRepository.findById(studentId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));

        // Agar rasm kaliti mavjud bo'lsa, Storage servisdan vaqtinchalik GET URL olamiz
        String url = null;
        if (student.getFacePhotoKey() != null && !student.getFacePhotoKey().isBlank()) {
            url = storageService.presignedGet(student.getFacePhotoKey());
        }

        return new FaceDto.FacePhotoResponse(url, student.getFacePhotoKey());
    }
}