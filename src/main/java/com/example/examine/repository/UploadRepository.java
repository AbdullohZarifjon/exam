package com.example.examine.repository;

import com.example.examine.entity.UploadEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * UploadRepository - UploadEntity obyektlarini MongoDB bazasi bilan bog'lovchi ombor.
 */
@Repository
public interface UploadRepository extends MongoRepository<UploadEntity, String> {

    /**
     * Fayl saqlash kaliti (S3 Key) bo'yicha qidirish.
     * @param key Faylning ombordagi unikal yo'li
     */
    Optional<UploadEntity> findByKey(String key);
}