package com.example.examine.config.migration;

import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * MongoMigrationRunner - MongoDB uchun versiyalangan migratsiya mexanizmi.
 *
 * <p>Ilova ishga tushganda (jumladan Docker konteynerida) barcha kerakli
 * kolleksiyalar va indekslarni yaratadi. Qaysi migratsiya qo'llanilgani
 * {@code _migrations} kolleksiyasida saqlanadi, shuning uchun migratsiyalar
 * idempotent (qayta ishga tushirish xavfsiz) hisoblanadi.</p>
 *
 * <p>Yangi migratsiya qo'shish uchun {@link #run(ApplicationArguments)} ichida
 * yangi versiya bilan {@link #apply(String, Runnable)} chaqiriladi.</p>
 */
@Component
@Order(1)
@RequiredArgsConstructor
public class MongoMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MongoMigrationRunner.class);

    /** Qo'llanilgan migratsiyalar tarixi saqlanadigan kolleksiya. */
    private static final String MIGRATIONS_COLLECTION = "_migrations";

    private final MongoTemplate mongoTemplate;

    @Override
    public void run(ApplicationArguments args) {
        createCollectionIfMissing(MIGRATIONS_COLLECTION);
        apply("V1__create_collections_and_indexes", this::v1CreateCollectionsAndIndexes);
    }

    /**
     * Migratsiyani faqat bir marta qo'llaydi.
     */
    private void apply(String version, Runnable migration) {
        if (isApplied(version)) {
            log.info("Mongo migration '{}' already applied, skipping", version);
            return;
        }

        log.info("Applying Mongo migration '{}'", version);
        migration.run();
        mongoTemplate.insert(
                new Document("_id", version).append("appliedAt", new Date()),
                MIGRATIONS_COLLECTION);
        log.info("Mongo migration '{}' applied successfully", version);
    }

    private boolean isApplied(String version) {
        return mongoTemplate.exists(
                Query.query(Criteria.where("_id").is(version)),
                MIGRATIONS_COLLECTION);
    }

    /**
     * V1 - barcha kolleksiyalar va indekslarni yaratadi.
     */
    private void v1CreateCollectionsAndIndexes() {
        List<String> collections = List.of(
                "users",
                "students",
                "exams",
                "questions",
                "attempts",
                "biometric_events",
                "uploads",
                "verification_requests",
                "counters"
        );
        collections.forEach(this::createCollectionIfMissing);

        // users: username unikal bo'lishi shart
        indexOps("users").createIndex(
                new Index().on("username", Sort.Direction.ASC).unique());

        // students: studentCode unikal bo'lishi shart
        indexOps("students").createIndex(
                new Index().on("studentCode", Sort.Direction.ASC).unique());

        // exams
        indexOps("exams").createIndex(new Index().on("createdBy", Sort.Direction.ASC));
        indexOps("exams").createIndex(new Index().on("status", Sort.Direction.ASC));

        // questions
        indexOps("questions").createIndex(new Index().on("examId", Sort.Direction.ASC));
        indexOps("questions").createIndex(
                new Index().on("examId", Sort.Direction.ASC)
                        .on("isActive", Sort.Direction.ASC)
                        .named("exam_active_idx"));

        // attempts
        indexOps("attempts").createIndex(new Index().on("examId", Sort.Direction.ASC));
        indexOps("attempts").createIndex(new Index().on("studentId", Sort.Direction.ASC));
        indexOps("attempts").createIndex(
                new Index().on("studentId", Sort.Direction.ASC)
                        .on("examId", Sort.Direction.ASC)
                        .named("student_exam_idx"));
        indexOps("attempts").createIndex(
                new Index().on("status", Sort.Direction.ASC)
                        .on("expiresAt", Sort.Direction.ASC)
                        .named("status_expires_idx"));
        indexOps("attempts").createIndex(
                new Index().on("resultToken", Sort.Direction.ASC).unique().sparse());

        // biometric_events
        indexOps("biometric_events").createIndex(new Index().on("studentId", Sort.Direction.ASC));
        indexOps("biometric_events").createIndex(new Index().on("examId", Sort.Direction.ASC));
        indexOps("biometric_events").createIndex(new Index().on("attemptId", Sort.Direction.ASC));
        indexOps("biometric_events").createIndex(
                new Index().on("attemptId", Sort.Direction.ASC)
                        .on("createdAt", Sort.Direction.DESC)
                        .named("attempt_event_idx"));

        // uploads
        indexOps("uploads").createIndex(
                new Index().on("entityType", Sort.Direction.ASC)
                        .on("entityId", Sort.Direction.ASC)
                        .named("entity_lookup_idx"));
        indexOps("uploads").createIndex(new Index().on("key", Sort.Direction.ASC));

        // verification_requests
        indexOps("verification_requests").createIndex(new Index().on("examId", Sort.Direction.ASC));
        indexOps("verification_requests").createIndex(new Index().on("studentId", Sort.Direction.ASC));
        indexOps("verification_requests").createIndex(new Index().on("status", Sort.Direction.ASC));
        // TTL indeks: ttlAt vaqti kelganda hujjat avtomatik o'chiriladi
        indexOps("verification_requests").createIndex(
                new Index().on("ttlAt", Sort.Direction.ASC).expire(0, TimeUnit.SECONDS));
    }

    private IndexOperations indexOps(String collection) {
        return mongoTemplate.indexOps(collection);
    }

    private void createCollectionIfMissing(String name) {
        if (!mongoTemplate.getCollectionNames().contains(name)) {
            mongoTemplate.createCollection(name);
            log.info("Created Mongo collection '{}'", name);
        }
    }
}
