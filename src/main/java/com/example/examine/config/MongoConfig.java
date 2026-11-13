package com.example.examine.config;

import com.example.examine.entity.VerificationRequestEntity;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;

import java.util.concurrent.TimeUnit;

/**
 * MongoConfig - MongoDB ma'lumotlar ombori uchun global sozlamalarni,
 * Auditing va TTL indekslarni dasturiy tarzda yaratuvchi konfiguratsiya klassi.
 */
@EnableMongoAuditing
@Configuration
public class MongoConfig {

    private final MongoTemplate mongoTemplate;

    public MongoConfig(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @PostConstruct
    public void initIndexes() {
        // ensureIndex o'rniga zamonaviy createIndex ishlatiladi
        mongoTemplate.indexOps(VerificationRequestEntity.class)
                .createIndex(new Index().on("ttlAt", Sort.Direction.ASC).expire(0, TimeUnit.SECONDS));
    }
}