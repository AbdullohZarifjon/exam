# Architecture

## Layered Architecture (DDD-Inspired)

The project follows a **layered architecture** inspired by Domain-Driven Design, with strict separation of concerns between layers.

```
┌─────────────────────────────────────┐
│  Controller (REST API endpoints)     │  ← Presentation Layer
├─────────────────────────────────────┤
│  Service (Business logic)            │  ← Application Layer
├─────────────────────────────────────┤
│  Repository (Data access via JPA)    │  ← Persistence Layer
├─────────────────────────────────────┤
│  Entity (JPA domain model)           │  ← Domain Layer
└─────────────────────────────────────┘
```

## Package Structure

All code lives under a single base package (e.g. `com.example.app`). The standard layout:

```
<base-package>/
├── config/           ← Application configuration
│   └── security/     ← Security configs, filters, services
├── constant/         ← Enums and constants (response codes, token types, role types, file types)
├── controller/       ← REST controllers, one per resource/role area
├── dto/              ← Data Transfer Objects (request/response DTOs)
│   └── <domain>/     ← One sub-package per domain area (e.g. auth/, user/, upload/)
├── entity/           ← JPA entities (domain model)
├── exception/        ← Custom exceptions and global handler
├── repository/       ← Spring Data JPA repositories
└── service/          ← Business logic services
```

Optional components when the project needs them:

- `config/<Name>Seeder` — seeds initial/bootstrap data (e.g. an initial admin account) at startup
- `config/AsyncConfig` — async executor configuration

## Layer Rules

- **Controller** only handles HTTP concerns (request/response, validation, routing)
- **Service** contains all business logic, transaction management
- **Repository** extends Spring Data JPA for data access
- **Entity** is a pure JPA entity with no business logic (beyond getters/setters)
- **DTO** records are used for all API input/output — entities are never exposed directly
- Dependencies flow: Controller → Service → Repository

## Key Design Decisions

- **Stateless authentication** via JWT — no server-side sessions
- **DTO-based communication** — all API contracts use dedicated DTO records
- **MapStruct** for entity-to-DTO mapping (compile-time, no reflection)
- **Flyway** for versioned, repeatable database migrations
- **Constructor injection** via Lombok `@RequiredArgsConstructor`
- **Per-IP rate limiting** via bucket4j (a dedicated rate-limit filter)
- **Presigned-URL S3 uploads** — clients upload directly to storage (a dedicated storage service)
