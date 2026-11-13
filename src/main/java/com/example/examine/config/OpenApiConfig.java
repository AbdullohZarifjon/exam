package com.example.examine.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenApiConfig - Swagger UI / OpenAPI 3 hujjatlarini sozlovchi konfiguratsiya.
 *
 * <p>Swagger UI manzili: {@code /swagger-ui.html}<br>
 * OpenAPI JSON manzili: {@code /v3/api-docs}</p>
 *
 * <p>Ilova JWT tokenlarni cookie orqali ham, {@code Authorization: Bearer ...}
 * header orqali ham qabul qiladi, shuning uchun ikkala xavfsizlik sxemasi
 * ham hujjatga qo'shilgan.</p>
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH = "bearerAuth";
    private static final String COOKIE_AUTH = "cookieAuth";

    @Bean
    public OpenAPI examineOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Examine API")
                        .version("1.0.0")
                        .description("""
                                Imtihon platformasi REST API.

                                Autentifikatsiya JWT orqali amalga oshiriladi:
                                - `Authorization: Bearer <access-token>` header, yoki
                                - `access-token` cookie.

                                Login: `POST /api/v1/auth/login`
                                """)
                        .contact(new Contact().name("Examine Team"))
                        .license(new License().name("Proprietary")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local"),
                        new Server().url("/").description("Current host")))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
                                .name(BEARER_AUTH)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT access token"))
                        .addSecuritySchemes(COOKIE_AUTH, new SecurityScheme()
                                .name("access-token")
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE)
                                .description("JWT access token cookie"))
                )
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH))
                .addSecurityItem(new SecurityRequirement().addList(COOKIE_AUTH));
    }
}
