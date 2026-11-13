# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Cache Maven dependencies first (best-effort; the build continues if a
# plugin cannot be resolved offline).
COPY pom.xml .
RUN mvn -B -DskipTests dependency:go-offline || true

# Compile and package the Spring Boot application.
COPY src ./src
RUN mvn -B -DskipTests package

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Run the application as a non-root user.
RUN groupadd --system app && useradd --system --gid app app

COPY --from=build /workspace/target/*.jar /app/app.jar
RUN chown -R app:app /app
USER app

EXPOSE 8080

# The project is compiled with --enable-preview, so the runtime must enable it
# as well. Extra JVM flags can be supplied through JAVA_OPTS.
ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS --enable-preview -jar /app/app.jar"]
