package com.example.examine.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StorageServiceTest {

    private final StorageService storageService = new StorageService(
            "http://localhost:9000", "examine", "minio", "minio-secret", "us-east-1");

    @Test
    void presignedPut_returnsUrlContainingKey() {
        String url = storageService.presignedPut("uploads/key.png", "image/png");

        assertThat(url).isNotBlank();
        assertThat(url).contains("uploads/key.png");
    }

    @Test
    void presignedGet_returnsUrlContainingKey() {
        String url = storageService.presignedGet("uploads/key.png");

        assertThat(url).isNotBlank();
        assertThat(url).contains("uploads/key.png");
    }

    @Test
    void exists_returnsFalseWhenObjectIsNotReachable() {
        assertThat(storageService.exists("missing-key")).isFalse();
    }
}
