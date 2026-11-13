package com.example.examine.config.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * RateLimitFilter - Har bir IP manzil bo'yicha so'rovlar sonini cheklovchi
 * (Bucket4j asosida ishlaydigan) xavfsizlik filtri. Bot hujumlari va spamni oldini oladi.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    /** Har bir IP uchun alohida token bucket xotirasi. */
    private final ConcurrentHashMap<String, Bucket> cache = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String clientIp = request.getRemoteAddr();

        // Har bir IP uchun 1 daqiqada maksimal 120 ta so'rovga ruxsat beramiz
        Bucket bucket = cache.computeIfAbsent(clientIp, k -> Bucket.builder()
                .addLimit(Bandwidth.simple(120, Duration.ofMinutes(1)))
                .build());

        if (!bucket.tryConsume(1)) {
            response.setStatus(429); // Too Many Requests
            response.setContentType("application/json");
            response.getWriter().write("{\"code\":429,\"message\":\"rate limited\",\"payload\":null}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}