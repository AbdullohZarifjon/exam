package com.example.examine.repository;

import com.example.examine.constant.VerificationStatus;
import com.example.examine.entity.VerificationRequestEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface VerificationRequestRepository extends MongoRepository<VerificationRequestEntity, String> {
    Optional<VerificationRequestEntity> findByStudentIdAndStatus(String studentId, VerificationStatus status);
    List<VerificationRequestEntity> findByStatusOrderByCreatedAtDesc(VerificationStatus status);
}
