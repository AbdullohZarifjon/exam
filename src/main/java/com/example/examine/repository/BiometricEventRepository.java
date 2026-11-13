package com.example.examine.repository;

import com.example.examine.entity.BiometricEventEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BiometricEventRepository extends MongoRepository<BiometricEventEntity, String> {
}
