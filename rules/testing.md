# Testing

## Principles

- **Test pyramid**: many fast unit tests at the base, fewer container-backed integration tests, fewest end-to-end API tests. Each higher layer covers only what the lower layers cannot.
- **One command runs everything**: the full suite must run with a single build command (`mvn test` / `gradle test`) both locally and in CI, with no manual setup beyond a running Docker daemon.
- **No external services in tests**: third-party systems (cloud storage, mail, payment, message brokers) are never called for real — replace them with mocks, fakes, or throwaway containers.
- **Tests are deterministic**: no reliance on wall-clock timing, execution order, network, or data left by other tests.

## Test Pyramid

| Layer | Scope | Tools | Infrastructure | Share |
|---|---|---|---|---|
| Unit | One class in isolation; collaborators mocked | JUnit 5, Mockito, AssertJ | None (no Docker) | ~70% |
| Integration | Persistence, transactions, migrations, security wiring with a real database | `@SpringBootTest` + Testcontainers | Container matching the production database engine and version | ~20% |
| API E2E | Full HTTP stack: filters, security, serialization, error contract | REST Assured + Testcontainers | Same container + real server on a random port | ~10% |

A higher layer must not repeat what a lower layer already proves.

## Layer Rules

### Unit tests

- No Spring context, no database, no network — pure JVM, milliseconds fast.
- Mock all collaborators; test business rules, edge cases, and error paths.
- Set injected configuration values (e.g. `@Value` fields) explicitly via test utilities, never rely on the environment.
- Use the production validation API (e.g. Bean Validation) directly to verify DTO constraints.
- Test generated mapping code (e.g. MapStruct) through the generated implementation, not through mocks.

### Integration tests

- Run against a real database engine in a container — the same engine and major version as production.
- Apply real schema migrations; enable schema validation so entity/migration drift fails the context load.
- Roll back each test's transaction so tests are order-independent.
- Cover: derived and custom queries, unique constraints, pagination, filtering, transactional behavior.
- Keep a context smoke test that boots the whole application — a green context load proves configuration and schema consistency.

### API E2E tests

- Start the real server on a random port; talk to it only over HTTP.
- Authenticate the way a real client does (e.g. cookies, headers) — never bypass the security layer.
- Cover: the authentication lifecycle, the role/permission matrix, one happy-path flow per domain area, and the error contract (validation, missing body, type mismatch, unknown routes, unauthorized/forbidden).
- External integrations are mocked at the service boundary; stub their behavior in the base class so flows that depend on them still run.

## Isolation Rules

- Each test creates its own data with unique identifiers; never assert exact global counts or assume an empty database.
- Never mutate or delete data owned by other tests; if a global query is under test, assert membership, not exclusivity.
- Container-backed tests that write through a real server cannot rely on rollback — use unique keys per test instead.
- Prefer one shared container per suite (singleton pattern, started once per JVM) over per-class containers; use a separate container per test layer when layers must not see each other's data.
- Never depend on test execution order.

## Conventions

- Naming: `*Test` for unit, `*IntegrationTest` for container-backed, `*E2ETest` for API tests.
- Tag every test class (`unit` / `integration` / `e2e`) so layers can be run selectively via build-tool group filters.
- Style: given / when / then; fluent assertions; one behavior per test; descriptive method names.
- Shared fixtures live in support/base classes and factory methods — no copy-pasted setup, no shared mutable state.

## Configuration

- Keep a dedicated test profile/properties file; override only what tests must change (rate limits, external endpoints).
- Never hardcode secrets or credentials in tests; use the same environment-variable defaults mechanism as production.
- Disable health indicators or startup checks that require real external systems when those systems are mocked.

## CI/CD

- The CI pipeline runs the same command as locally; runners must provide Docker for containers.
- Upload test reports as artifacts on every run, including failures.
- Optional fast path: run only unit tests on pull requests, the full suite on the main branch or nightly.

## When a Test Finds a Product Bug

- Fixing product code is in scope: a failing test that reveals a real defect is fixed by correcting the product, not by weakening the test.
- Document the defect and the fix alongside the test that covers it.
