package com.example.examine.repository;

import com.example.examine.constant.ExamStatus;
import com.example.examine.entity.ExamEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ExamRepository - ExamEntity ma'lumotlarini MongoDB bilan bog'lovchi Spring Data ombori.
 */
@Repository
public interface ExamRepository extends MongoRepository<ExamEntity, String> {

    /**
     * Ma'lum bir o'qituvchi yaratgan barcha imtihonlarni topish.
     * @param createdBy O'qituvchi (User) ID si
     */
    List<ExamEntity> findByCreatedBy(String createdBy);

    /**
     * Muayyan statusdagi imtihonlar ro'yxatini olish (masalan, PUBLISHED imtihonlar).
     * @param status Imtihon statusi (DRAFT, PUBLISHED, ARCHIVED)
     */
    List<ExamEntity> findByStatus(ExamStatus status);
}