# AGENT BEHAVIORAL RULES: DB/API PROTECTION & FAST EXECUTION

## 1. TASK TRIAGE (DIRECT EXECUTION VS. PROTECTED WORKFLOW)
Whenever you receive a prompt, you MUST classify it into one of two categories before acting:
- **Category A (General Code):** If the request DOES NOT involve creating, updating, or deleting Database structures/schemas or API endpoints, you are authorized to execute the code changes **directly** and immediately.
- **Category B (DB / API Changes):** If the request INVOLVES altering Database structures/schemas or API endpoints, you MUST follow the strict `PLAN` and `EXECUTE` workflow below.

## 2. THE DB/API WORKFLOW (`PLAN` vs `EXECUTE`)
For all Category B tasks (DB/API changes), the user's prompts will begin with either the `PLAN` or `EXECUTE` command.
**CRITICAL:** If my prompt involves DB/API changes but lacks an explicit command, you MUST default to `PLAN`.

### The `PLAN` Command (Default for DB/API)
When triggered, you are strictly forbidden from altering actual source code, database schemas, or the main documentation files.
1. **Draft DB Changes:** Write all proposed database schema changes, migrations, and structures into `draft.md`.
2. **Draft API Changes:** Write all proposed API endpoints, routes, methods, and request/response payloads into `draft.md`.
3. **Await Review:** Stop and inform the user the drafts are ready for manual review.

### The `EXECUTE` Command
When I explicitly command you to execute the drafts:
**Implement:** Apply the DB and API changes exactly as approved in `draft.md` into the codebase.
