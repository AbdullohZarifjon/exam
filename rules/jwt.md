# JWT (JSON Web Token)

## Library
**jjwt** (io.jsonwebtoken) 0.12.6

## Configuration
- `jwt.secret` — HMAC-SHA256 signing key (min 256 bits), provided by a `SecretKeyProvider`-style component
- `cookie.secured` — Set `Secure` flag on cookies (false for dev/HTTP, true for prod/HTTPS)
- `cookie.access_token_validity` — Access token lifetime in seconds (default: 900 = 15 min)
- `cookie.refresh_token_validity` — Refresh token lifetime in seconds (default: 604800 = 7d)

## Token Delivery — Cookies (NOT Bearer Header)

**Tokens are delivered via HttpOnly cookies, never via `Authorization: Bearer` header.** This prevents XSS-based token theft. The raw tokens are also returned in the auth response body of sign-in/refresh for client convenience.

### Cookie Properties

| Cookie | Name | Path | HttpOnly | Secure | SameSite |
|--------|------|------|----------|--------|----------|
| Access token | `access-token` | `/` | true | true (prod) | Strict |
| Refresh token | `refresh-token` | `<refresh-endpoint-path>` | true | true (prod) | Strict |

- `secure` is controlled by `cookie.secured` — `false` for local development (HTTP), `true` for production (HTTPS)
- `SameSite=Strict` prevents CSRF-based token exfiltration
- Access token path is `/` so it's sent on all API requests
- Refresh token path is restricted to the refresh endpoint only (e.g. `/auth/refresh`)

## JWT Claims
Each token carries `id`, `email`, `role`, and `type` (`ACCESS` or `REFRESH`) claims. The `type` claim is validated so an access token cannot be used as a refresh token and vice versa.

## JwtAuthFilter (Cookie-Based)
A `JwtAuthFilter` (in `config/security/`) extracts the JWT from the `access-token` cookie via `WebUtils.getCookie`. Behavior:
- No cookie → request continues unauthenticated (filter chain proceeds)
- Valid JWT → builds `UsernamePasswordAuthenticationToken` from a token DTO, sets `SecurityContext`
- Invalid/expired JWT → returns **401 Unauthorized** immediately

## Token Flow
```
1. Login/Register → Server returns access + refresh tokens via Set-Cookie headers (and in the response body)
2. API requests → Browser auto-sends access-token cookie → JwtAuthFilter validates
3. Token refresh → Browser sends refresh-token cookie to the refresh endpoint → new cookies set
4. Sign-out → Server sends empty cookies (maxAge=0) to clear tokens
