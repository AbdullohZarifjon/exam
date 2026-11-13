# Maven

## Version
Apache Maven 3.9+ with the project's Java toolchain (e.g. Java 21)

## Build Configuration
`pom.xml` uses:
- `spring-boot-starter-parent`
- The project's Java version (`<java.version>` property)
- Project-specific `groupId`/`artifactId`/`version` coordinates

## Key Plugins
- `spring-boot-maven-plugin` — packages executable JAR
- `maven-compiler-plugin` — configured with Lombok + MapStruct annotation processors
- Lombok runs before MapStruct in the annotation processor chain via `lombok-mapstruct-binding`

## Commands
- `mvn clean package` — build executable JAR
- `mvn spring-boot:run` — run the application
- `mvn test` — run tests
- `mvn clean package -DskipTests` — build without running tests
