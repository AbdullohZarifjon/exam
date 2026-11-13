package com.example.examine.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

class FaceServiceConfigTest {

    @Test
    void restClient_isCreatedWithConfiguredBaseUrl() {
        FaceServiceConfig config = new FaceServiceConfig();
        ReflectionTestUtils.setField(config, "faceServiceBaseUrl", "http://localhost:8000");

        RestClient restClient = config.restClient();

        assertThat(restClient).isNotNull();
    }
}
