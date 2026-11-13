package com.example.examine.config.security;

import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * SecretKeyProvider - application.yml faylidagi maxfiy so'zni (secret) o'qib,
 * JJWT kutubxonasi talab qiladigan xavfsiz SecretKey obyektiga aylantirib beruvchi komponent.
 */
@Component
public class SecretKeyProvider {

    private final SecretKey key;

    public SecretKeyProvider(@Value("${jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public SecretKey getKey() {
        return key;
    }
}