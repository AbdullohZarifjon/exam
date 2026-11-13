package com.example.examine.repository;

import com.example.examine.constant.AttemptStatus;
import com.example.examine.entity.AttemptEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttemptRepository extends MongoRepository<AttemptEntity, String> {

    /**
     * Talabaning ma'lum bir imtihon bo'yicha joriy faol urinishini topish.
     */
    Optional<AttemptEntity> findByExamIdAndStudentIdAndStatus(
            String examId, String studentId, AttemptStatus status
    );

    /**
     * Talabaning muayyan imtihondagi barcha urinishlari tarixi.
     */
    List<AttemptEntity> findByExamIdAndStudentId(String examId, String studentId);

    /**
     * Result token bo'yicha urinishni topish.
     */
    Optional<AttemptEntity> findByResultToken(String resultToken);

}