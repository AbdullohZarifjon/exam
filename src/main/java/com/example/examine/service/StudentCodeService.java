package com.example.examine.service;

import com.example.examine.entity.CounterEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Year;

/**
 * StudentCodeService - Atomik tarzda har bir talaba uchun noyob va ketma-ket
 * talaba kodini (Masalan: STU-2026-1) generatsiya qiluvchi xizmat.
 */
@Service
@RequiredArgsConstructor
public class StudentCodeService {

    private final MongoTemplate mongoTemplate;

    public synchronized String generate() {
        Query query = new Query(Criteria.where("_id").is("student_code"));
        Update update = new Update().inc("seq", 1L);

        CounterEntity counter = mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true).upsert(true),
                CounterEntity.class
        );

        long sequenceValue = (counter != null) ? counter.getSeq() : 1L;
        return "STU-" + Year.now().getValue() + "-" + sequenceValue;
    }
}