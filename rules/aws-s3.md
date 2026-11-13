# AWS S3 (Object Storage)

## Library
Spring Cloud AWS S3 Starter (`io.awspring.cloud:spring-cloud-aws-starter-s3`)

Uses `S3Template` and `S3Presigner` — Spring-idiomatic abstractions over S3 operations. The underlying S3Client is auto-configured by Spring Boot from `spring.cloud.aws.*` application properties.

## Service Pattern
The storage service (e.g. a `StorageService` in the service layer) does **not** upload files directly. Instead it issues **presigned PUT URLs** so clients upload straight to S3, then returns the public file URL:

```java
StorageService.UploadResult result = storageService.prepareUpload(folder, id, request);
// result.uploadUrl() → presigned PUT URL (valid for storage.presigned-url-expiration seconds)
// result.fileUrl()   → {storage-endpoint}/{bucket}/{folder}/{id}.{extension}
```

## Configuration (application.yaml)
```yaml
spring:
  cloud:
    aws:
      s3:
        endpoint: ${STORAGE_ENDPOINT:<storage-endpoint>}
        path-style-access-enabled: true
      region:
        static: <region>
      credentials:
        access-key: ${STORAGE_ACCESS_KEY:<access-key>}
        secret-key: ${STORAGE_SECRET_KEY:<secret-key>}

storage:
  bucket: ${STORAGE_BUCKET:<bucket>}
  presigned-url-expiration: ${STORAGE_PRESIGNED_URL_EXPIRATION:900}
```

## Configuration (environment variables)
All values are injected via environment variables with sensible development defaults:
```
STORAGE_ENDPOINT=<storage-endpoint-url>
STORAGE_BUCKET=<bucket-name>
STORAGE_ACCESS_KEY=<access-key>
STORAGE_SECRET_KEY=<secret-key>
STORAGE_PRESIGNED_URL_EXPIRATION=900
```
