# Spring Security

## Configuration
Defined in a `SecurityConfig` (in `config/security/`) using the modern lambda-based DSL.

## Authentication Flow

```
Request (with access-token cookie) → RateLimitFilter → JwtAuthFilter → SecurityContext → Controller
```

1. **RateLimitFilter** (a `OncePerRequestFilter` in `config/security/`) runs first and enforces a per-IP bucket4j token bucket (HTTP 429 when exhausted).
2. **JwtAuthFilter** (a `OncePerRequestFilter` in `config/security/`) extracts the JWT from the `access-token` cookie (using `WebUtils.getCookie`).
3. Validates token, extracts user id, email and role from claims, builds a `UsernamePasswordAuthenticationToken` with a single `SimpleGrantedAuthority(roleName)`.
4. Sets `SecurityContext` if valid; returns 401 if invalid.

## Security Components (in `config/security/`)

| Component               | Role |
|-------------------------|------|
| SecurityConfig          | Main security configuration, filter chain, CORS |
| JwtAuthFilter           | Extracts JWT from cookie, sets SecurityContext |
| JwtService              | JWT generation, validation, claim extraction |
| SecretKeyProvider       | Provides HMAC-SHA256 signing key from `jwt.secret` |
| JwtTokenDto             | Record returned by token validation (`id`, `email`, `roleName`) |
| CustomUserDetailsService| Loads user by email, builds authorities for login |
| RateLimitFilter         | Per-IP bucket4j rate limiting |

## Authorization Rules (SecurityConfig)

- **Permit all:** public endpoints (e.g. `/public/**`), documentation (`/swagger-ui/**`, `/v3/api-docs/**`), the auth endpoints that must be reachable unauthenticated (e.g. `/auth/sign-in`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`), and health checks (`/actuator/health`)
- **Admin endpoints** (e.g. `/admin/**`) require an admin authority
- **Any other request** must be authenticated
- `@EnableMethodSecurity` enables `@PreAuthorize` on individual controllers/services

## Key Decisions
- **Stateless** (SessionCreationPolicy.STATELESS)
- **CSRF disabled** (API-only application)
- **BCrypt** password encoding
- **CORS** configured from `app.cors.*` properties
- **@EnableMethodSecurity** for `@PreAuthorize`
