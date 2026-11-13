package com.example.examine.config.security;

import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;

import static org.assertj.core.api.Assertions.assertThat;

class SecretKeyProviderTest {

    @Test
    void getKey_buildsHmacShaKey() {
        SecretKeyProvider provider = new SecretKeyProvider("01234567890123456789012345678901");

        SecretKey key = provider.getKey();

        assertThat(key).isNotNull();
        assertThat(key.getAlgorithm()).isEqualTo("HmacSHA256");
        assertThat(key.getEncoded()).hasSize(32);
    }
}
