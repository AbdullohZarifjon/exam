package com.example.examine.repository;

import com.example.examine.entity.UserEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * UserRepository - UserEntity obyektlarini MongoDB bilan bog'lovchi ombor.
 */
@Repository
public interface UserRepository extends MongoRepository<UserEntity, String> {

    /**
     * Username bo'yicha xodimni topish.
     * @param username Unikal login nomi
     */
    Optional<UserEntity> findByUsername(String username);
}
