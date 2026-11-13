package com.example.examine.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.time.Duration;

/**
 * StorageService - AWS S3 yoki MinIO ob'ekt saqlash ombori bilan ishlovchi xizmat
 * (Pre-signed URL generatsiya qilish va fayl mavjudligini tekshirish).
 */
@Service
public class StorageService {

    private final String endpoint;
    private final String bucket;
    private final String accessKey;
    private final String secretKey;
    private final String region;

    /** Pre-signed URL amal qilish muddati (sekundda, default: 15 daqiqa). */
    @Value("${storage.presigned-url-expiration:900}")
    private long presignedUrlExpiration;

    public StorageService(
            @Value("${storage.endpoint}") String endpoint,
            @Value("${storage.bucket}") String bucket,
            @Value("${storage.access-key}") String accessKey,
            @Value("${storage.secret-key}") String secretKey,
            @Value("${storage.region:us-east-1}") String region) {
        // MinIO endpoint oxiridagi "/" belgisini olib tashlaymiz.
        this.endpoint = endpoint.endsWith("/")
                ? endpoint.substring(0, endpoint.length() - 1)
                : endpoint;
        this.bucket = bucket;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.region = region;
    }

    private S3Client createS3Client() {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .forcePathStyle(true)
                .build();
    }

    private S3Presigner createPresigner() {
        return S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                // MinIO virtual-host uslubini qo'llab-quvvatlamaydi, shuning uchun path-style majburiy.
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    public String presignedPut(String key, String contentType) {
        try (S3Presigner presigner = createPresigner()) {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .putObjectRequest(putRequest)
                    .signatureDuration(expirationDuration())
                    .build();

            return presigner.presignPutObject(presignRequest).url().toString();
        }
    }

    public String presignedGet(String key) {
        try (S3Presigner presigner = createPresigner()) {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .getObjectRequest(getRequest)
                    .signatureDuration(expirationDuration())
                    .build();

            return presigner.presignGetObject(presignRequest).url().toString();
        }
    }

    /**
     * Pre-signed URL muddatini qaytaradi. Spring kontekstidan tashqarida
     * (masalan, unit testlarda) qiymat 0 bo'lishi mumkin, shuning uchun
     * xavfsiz default (15 daqiqa) qo'llaniladi.
     */
    private Duration expirationDuration() {
        long seconds = presignedUrlExpiration > 0 ? presignedUrlExpiration : 900L;
        return Duration.ofSeconds(seconds);
    }

    public boolean exists(String key) {
        try (S3Client client = createS3Client()) {
            client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}