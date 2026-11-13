# Rules For Writing Rules (Meta-Rules)

These meta-rules govern every rule document in the `rules/` folder. They keep the rules **project-agnostic** so the entire folder can be copied into any other project and reused as-is.

## Golden Rule

Every rule document must be written so it could be dropped into a completely different project without modification. Rules describe **patterns, conventions, and workflows** — never a specific project's identity, data, or code.

## What Is Forbidden in Rules

Never include any of the following project-specific details in a rule document:

- **Project-specific package or base package names** (e.g. `kpi`, `com.mycompany.myapp`) — use `<base-package>` or "the base package"
- **Source-file paths or links to concrete project files** (e.g. `src/main/java/.../UserService.java`) — refer to components by role/pattern name instead (e.g. "the storage service in the service layer")
- **Domain-specific entities, enums, or business terms** (e.g. degrees, jobs, docs, prorectors, faculties, specific role names like `TEACHER`) — use neutral examples (`ExampleEntity`, `ExampleDto`, "a role enum")
- **Concrete infrastructure values**: hostnames, endpoints, bucket names, credentials, secret defaults, ports, artifact/groupId coordinates, project names — use `<placeholder>` or `${ENV_VAR:default}` patterns
- **Concrete domain response/business error codes and their tables** — describe the numbering convention instead; each project maintains its own code table elsewhere
- **Tool-specific or agent-specific wording** (e.g. addressing one particular AI assistant by name) — rules address "the agent/developer" generically

## What Is Allowed in Rules

- **Reusable patterns and architecture decisions** (layered architecture, DTO envelope, cookie-based JWT, presigned uploads, test pyramid, etc.)
- **Standard conventions** that hold for any project using the same stack (Flyway migration naming, snake_case columns, `*Test` naming, response code ranges)
- **Concrete class names only when they name a pattern** that each project replicates (e.g. `SecurityConfig`, `ResponseDto`, `GlobalExceptionHandler`, `JwtAuthFilter`) — written as "a `SecurityConfig` (in `config/security/`)", not as a link to a file
- **Placeholders** in the form `<thing>` for values that differ per project (e.g. `<default-port>`, `<bucket>`, `<refresh-endpoint-path>`), and environment-variable patterns `${ENV_VAR:default}`
- **Examples** marked clearly as examples (e.g. "e.g. Java 21", "e.g. `/auth/refresh`")

## Per-Project Supplements

Anything genuinely project-specific (artifact coordinates, domain error code tables, concrete endpoint lists, specific role values) must live in a separate project-specific document (e.g. `PROJECT.md` or a project-specific rules supplement) — **not** in the shared `rules/` folder.

## When Editing Rules

Before saving any change to a rule document, verify it passes this checklist:

1. Would this file work unchanged in a different project with a different name, domain, and database?
2. Are there zero hardcoded paths, package names, hostnames, ports, credentials, or domain terms?
3. Are project-varying values expressed as placeholders or environment variables?
4. If a value is given concretely, is it clearly an example ("e.g. ...") rather than a requirement?

If any answer is "no", rewrite the change until all answers are "yes".
