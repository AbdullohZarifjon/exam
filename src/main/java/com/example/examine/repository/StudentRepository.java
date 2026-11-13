package com.example.examine.repository;

import com.example.examine.entity.StudentEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * StudentRepository - StudentEntity obyektlarini MongoDB bazasi bilan bog'lovchi ombor.
 */
@Repository
public interface StudentRepository extends MongoRepository<StudentEntity, String> {

    /**
     * Talabaning unikal kodi (studentCode) bo'yicha qidirish.
     * @param studentCode Talabaning unikal kodi (Masalan: STU-2026-1)
     */
    Optional<StudentEntity> findByStudentCode(String studentCode);
}