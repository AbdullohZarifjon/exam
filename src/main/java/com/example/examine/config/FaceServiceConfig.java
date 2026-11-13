package com.example.examine.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * FaceServiceConfig - Timeout va BaseUrl sozlangan professional RestClient konfiguratsiyasi.
 */
@Configuration
public class FaceServiceConfig {

    // application.yml fayolidan Python servis manzilini o'qiymiz
    @Value("${face-service.base-url:http://localhost:8000}")
    private String faceServiceBaseUrl;

    @Bean
    public RestClient restClient() {
        // HTTP so'rovlar uchun vaqt cheklovlarini (Timeout) o'rnatamiz
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5)); // Serverga ulanish uchun 5 sekund
        requestFactory.setReadTimeout(Duration.ofSeconds(15));    // Javob olish uchun 15 sekund

        return RestClient.builder()
                .baseUrl(faceServiceBaseUrl) // Asosiy URL manzilni bazaviy qilib o'rnatamiz
                .requestFactory(requestFactory)
                .build();
    }
}