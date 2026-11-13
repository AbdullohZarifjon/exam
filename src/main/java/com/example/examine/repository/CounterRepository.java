package com.example.examine.repository;

import com.example.examine.entity.CounterEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CounterRepository extends MongoRepository<CounterEntity, String> {
}
