# Spring Boot

## Version
Spring Boot with the project's Java toolchain (e.g. Java 21).

## Commonly Used Modules

Add starters per project need. Commonly used ones:

| Module | Purpose |
|--------|---------|
| `spring-boot-starter-web` | REST API, embedded Tomcat, Jackson |
| `spring-boot-starter-data-jpa` | JPA/Hibernate ORM with Spring Data |
| `spring-boot-starter-security` | Authentication and authorization |
| `spring-boot-starter-validation` | Bean validation (`@Valid`, `@NotBlank`, etc.) |
| `spring-boot-starter-actuator` | Health checks and monitoring |
| `spring-boot-starter-mail` | SMTP email (e.g. password reset) |
| `springdoc-openapi-starter-webmvc-ui` | Swagger UI / OpenAPI docs |
| `bucket4j-core` | Rate limiting |
| `spring-cloud-aws-starter-s3` | S3 storage (presigned URLs) |

## Configuration Management

- **Single config file**: `application.yaml` (no separate dev/prod profile files)
- **Dev flag**: `dev: ${DEV:true}` custom property toggles dev mode
- **Environment variables**: All sensitive values (DB credentials, JWT secrets, storage keys) injected via `${ENV_VAR:default}`

## Virtual Threads

Virtual threads enabled (`spring.threads.virtual.enabled: true`) for improved throughput on I/O-bound operations.

## HTTP / Server
- Server port: `${SERVER_PORT:<default-port>}`
- HTTP/2 enabled (`server.http2.enabled: true`)
- Logging via a logback config file (e.g. `logback-config.xml`)
