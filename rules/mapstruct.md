# MapStruct

## Version
MapStruct 1.6.3 with Lombok integration

## Configuration
```java
@Mapper(componentModel = "spring")
public interface <MapperService> { ... }
```

## Usage
Maps between JPA entities and DTOs at compile time (no reflection):

```java
ExampleDto mapEntityToDto(ExampleEntity entity);
```

## Custom Mapping
Uses `expression` for complex field mappings (e.g., converting an enum role to its string name):

```java
@Mapping(target = "role", expression = "java(entity.getRole().name())")
ExampleDto mapEntityToDto(ExampleEntity entity);
```

## Key Benefits
- **Compile-time** code generation — zero runtime overhead
- **Type-safe** — compilation fails on mapping errors
- **Spring integration** — mappers are injectable beans
- **Lombok compatible** — works with `@Getter`/`@Setter` entities
