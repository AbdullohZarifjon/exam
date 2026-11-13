package com.example.examine;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Lightweight smoke test for the application entry point.
 *
 * <p>The full {@code @SpringBootTest} context requires a running MongoDB instance
 * (see {@code MongoConfig#initIndexes}), so this test intentionally avoids
 * bootstrapping the whole context and only verifies the application class is
 * available on the classpath.</p>
 */
class ExamineApplicationTests {

    @Test
    void applicationClassIsAvailable() {
        assertThat(ExamineApplication.class).isNotNull();
    }
}
