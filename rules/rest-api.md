# REST API Design

## Standards
- **Almost all API responses return `ResponseDto<T>`**: `{ code, message, payload }`
- Controller methods return `ResponseEntity<ResponseDto<T>>` where `T` is the DTO or `Object`/`Void`
- HTTP status codes used properly (200, 400, 401, 403, 404, 429, 500)
- Specific APIs for webhooks and integration with other systems may be exceptional and allow another format.

## ResponseDto (Mandatory)
Almost every controller endpoint must wrap its response in a `ResponseDto<T>` record (in the `dto/` package). No raw entities or arbitrary JSON objects should ever be returned directly.

Exceptions are acceptable in webhooks and in integrations with other systems.

```java
public record ResponseDto<T>(Integer code, String message, T payload) {
    public static <T> ResponseDto<T> getSuccess(T payload);
    public static ResponseDto<Object> getEmptySuccess();
}
```

Every java record used as dto in ResponseDto payload should have 'Dto' suffix in the end of the name!

**Usage pattern** — controllers always return `ResponseEntity<ResponseDto<...>>`:
```java
return ResponseEntity.ok(ResponseDto.getSuccess(payload));
return ResponseEntity.ok(ResponseDto.getEmptySuccess());
```

Exception handlers in the `GlobalExceptionHandler` (`exception/` package) also produce `ResponseDto` error responses.

## ResponseType — Standardized Response Codes

A `ResponseType` enum (in the `constant/` package) defines every possible API response code and its message format. Each constant encodes a `code:message` pair as a single format string:

```java
public enum ResponseType {
    SUCCESS("0:success"),
    INTERNAL_SERVER_ERROR("1:internal server error"),
    // domain-specific codes
    NEW_DOMAIN_ERROR("1001:description of the domain error"),
    BAD_REQUEST("99999:bad request");
}
```

### How ResponseType combines with ResponseDto

The bridge between `ResponseType` and `ResponseDto` is the static method `ResponseType.getDtoByMessage(String)`:

```java
public static ResponseDto<Object> getDtoByMessage(String message) {
    String[] parts = message.split(":", 2);
    return new ResponseDto<>(
            Integer.valueOf(parts[0]),  // code
            parts[1],                    // message
            null                         // no payload for error responses
    );
}
```

This method **parses** a `"code:message"` string back into a `ResponseDto`. It is the standard way to produce error `ResponseDto` instances — you pass a `ResponseType`'s `messageFormat` (or a formatted version of it) and get a fully built response DTO.

**For success responses**, use `ResponseDto.getSuccess(payload)` or `ResponseDto.getEmptySuccess()` directly in controllers.

**For error responses**, the pipeline always goes through `ResponseType.getDtoByMessage()` inside `GlobalExceptionHandler`:

```java
// Example from GlobalExceptionHandler:
ResponseType.getDtoByMessage(
    ResponseType.INTERNAL_SERVER_ERROR.getMessageFormat()
);
// → ResponseDto(1, "internal server error", null)

// Example with CustomBadRequestException:
ResponseType.getDtoByMessage(exception.getMessage());
// where exception.getMessage() is "1001:some domain error"
// → ResponseDto(1001, "some domain error", null)
```

### ResponseType code numbering conventions

| Range    | Purpose                              |
|----------|--------------------------------------|
| 0        | Success                              |
| 1–99     | Framework/infrastructure errors      |
| 1001–1999| Domain/business-logic errors         |
| 99999    | Catch-all `BAD_REQUEST`              |

Common framework-level codes (1–99) cover: no resource found, missing/invalid method arguments, missing request body, validation errors, argument type mismatch, file upload limits, unsupported file types. Domain/business-logic codes (1001–1999) are defined per project — each project owns its own set of specific domain error codes and maintains its own code table in this document (or a project-specific supplement).

## Adding a New ResponseType

When you need a new response code for a business-logic error, follow these steps:

### 0. Golden rule: one ResponseType per business case

Create a **new, specific `ResponseType`** for every distinct business-logic error. Never reuse an existing `ResponseType` for a different semantic meaning (e.g., don't use a "no entity with this id" code for email-based lookups). Never use `BAD_REQUEST` as a generic catch-all — it should only be used when no more specific code is appropriate (which should be rare).

This ensures each API error response carries a unique, meaningful code that clients can rely on for programmatic error handling.

### 1. Add a constant to `ResponseType`

```java
// In the ResponseType enum:
NEW_DOMAIN_ERROR("<next-available-code>:description of the error"),
```

- Messages are plain text with no placeholders. Each `ResponseType` holds a fixed `code:message` string.
- Always pick the next sequential unused code within the 1001–1999 range.

### 2. Throw it from the service layer via `CustomBadRequestException`

```java
throw new CustomBadRequestException(ResponseType.NEW_DOMAIN_ERROR);
```

`CustomBadRequestException` (in the `exception/` package) takes a `ResponseType` and calls `super(responseType.getMessageFormat())`, so `exception.getMessage()` returns the `"code:message"` string that the handler expects.

### 3. Nothing else to do — it works automatically

The existing `GlobalExceptionHandler.handleCustomBadRequestException()` already catches all `CustomBadRequestException` instances and converts them to `ResponseDto` via `ResponseType.getDtoByMessage()`.

**No changes are needed in:**
- `GlobalExceptionHandler` — it handles `CustomBadRequestException` generically.
- `ResponseDto` — error DTOs are always built by `ResponseType.getDtoByMessage()`.
- Controllers — they never construct error responses directly.

### 4. Update the project's code table

Add the new constant to the project's ResponseType code table (maintained in this document's "Complete ResponseType codes" section or a project-specific supplement).

## CustomBadRequestException — Typed Domain Exceptions

`CustomBadRequestException` is the **single exception class** used across all service layers to signal business-logic errors. It carries a `ResponseType` so that the exception handler can reconstruct a proper `ResponseDto`.

```java
public class CustomBadRequestException extends RuntimeException {
    public CustomBadRequestException(ResponseType responseType) {
        super(responseType.getMessageFormat());
    }
}
```

### The complete pipeline: from service to HTTP response

The three classes work together in a consistent pipeline:

```
Service Layer                          Exception Handler                   HTTP Response
───────────                            ─────────────────                   ─────────────
throw new CustomBadRequestException(   →  catches the exception           →  400 BAD REQUEST
    ResponseType.SOME_DOMAIN_ERROR        calls ResponseType.getDtoByMessage()  {
);                                         on exception.getMessage()             "code": 1001,
// exception.getMessage()                                                         "message": "<error>",
// → "1001:<error>"                                                              "payload": null
                                                                              }
```

**Step-by-step flow:**

1. **Service throws** — A service method encounters a business rule violation and throws `CustomBadRequestException` with the appropriate `ResponseType`:
   ```java
   if (userRepository.existsByEmail(email)) {
       throw new CustomBadRequestException(ResponseType.EMAIL_IS_ALREADY_USED);
   }
   ```
   The exception's message is the `ResponseType`'s `messageFormat` (e.g. `"1001:email is already used"`).

2. **Exception handler catches** — `GlobalExceptionHandler.handleCustomBadRequestException()` intercepts the exception:
   ```java
   @ExceptionHandler(CustomBadRequestException.class)
   @ResponseStatus(HttpStatus.BAD_REQUEST)
   private ResponseEntity<ResponseDto<Object>> handleCustomBadRequestException(
           CustomBadRequestException exception) {
       return ResponseEntity.badRequest().body(
               ResponseType.getDtoByMessage(exception.getMessage())
       );
   }
   ```

3. **ResponseDto is built** — `ResponseType.getDtoByMessage()` splits the message on the first `:` to extract the code and human-readable message, producing `ResponseDto(1001, "<error message>", null)`.

4. **HTTP response returned** — The handler wraps it in `ResponseEntity.badRequest()`, so the client receives HTTP 400 with the structured JSON body.

### When to use each approach

| Scenario                                          | What to use                                               |
|---------------------------------------------------|-----------------------------------------------------------|
| Controller returns successful data                | `ResponseEntity.ok(ResponseDto.getSuccess(payload))`      |
| Controller returns success with no data           | `ResponseEntity.ok(ResponseDto.getEmptySuccess())`        |
| Service detects a business rule violation         | `throw new CustomBadRequestException(TYPE)`               |
| Framework-level error (validation, missing body)  | Handled automatically by `GlobalExceptionHandler`         |
| Unexpected/uncaught error                         | Caught by generic `Exception` handler → 500               |

### Key rule: never construct ResponseDto manually for errors

Do **not** manually create `ResponseDto` for error responses in services or controllers. Always throw `CustomBadRequestException` with the appropriate `ResponseType`. The `GlobalExceptionHandler` is the single place where error `ResponseDto` objects are assembled.

## Validation
- `@Valid` on request bodies triggers Jakarta Bean Validation
- `@NotBlank`, `@Email`, `@Size`, `@Pattern` on DTO fields
- Validation errors return structured `ResponseDto` with field-level messages

## Global Exception Handling
A `GlobalExceptionHandler` (`@RestControllerAdvice`) handles:
- `AccessDeniedException` → 403 with typed response (as `ResponseDto`)
- `CustomBadRequestException` → 400 with typed response (as `ResponseDto`)
- `DataIntegrityViolationException` → 400 (as `ResponseDto`, `DUPLICATE_ENTRY`)
- `NoResourceFoundException` → 400 (as `ResponseDto`)
- `HttpMessageNotReadableException` → 400 (as `ResponseDto`)
- `MissingServletRequestParameterException` → 400 (as `ResponseDto`)
- `MethodArgumentNotValidException` → 400 with field details (as `ResponseDto`)
- `HandlerMethodValidationException` → 400 (as `ResponseDto`)
- `MethodArgumentTypeMismatchException` → 400 (as `ResponseDto`)
- `Exception` → 500 catch-all (as `ResponseDto`)
