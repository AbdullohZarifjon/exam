package com.example.examine.repository;

import com.example.examine.entity.QuestionEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * QuestionRepository - QuestionEntity ma'lumotlarini MongoDB bilan bog'lovchi ombor.
 */
@Repository
public interface QuestionRepository extends MongoRepository<QuestionEntity, String> {

    /**
     * Muayyan imtihonga tegishli barcha savollarni topish.
     * @param examId Imtihon ID si
     */
    List<QuestionEntity> findByExamId(String examId);
}