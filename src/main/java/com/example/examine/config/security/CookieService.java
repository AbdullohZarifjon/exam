package com.example.examine.config.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * CookieService - JWT tokenlarni brauzerda xavfsiz HttpOnly Cookie ko'rinishida
 * saqlash, yangilash va o'chirish amallarini bajaruvchi servis.
 */
@Service
public class CookieService {

    /** HTTPS ulanish talab qilinishini belgilovchi bayroq (productionda true bo'ladi). */
    private final boolean secured;

    public CookieService(@Value("${cookie.secured:false}") boolean secured) {
        this.secured = secured;
    }

    /**
     * Klientga Access token'ni HttpOnly cookie sifatida yozish.
     *
     * @param response HTTP Response
     * @param token    JWT Access token qiymati
     * @param maxAge   Amal qilish muddati (sekundda)
     */
    public void setAccess(HttpServletResponse response, String token, long maxAge) {
        Cookie cookie = new Cookie("access-token", token);
        cookie.setPath("/");
        cookie.setHttpOnly(true); // XSS hujumlaridan himoya qilish uchun JS o'qiy olmaydi
        cookie.setSecure(secured);
        cookie.setMaxAge((int) maxAge);
        cookie.setAttribute("SameSite", "Strict"); // CSRF hujumlarining oldini oladi
        response.addCookie(cookie);
    }

    /**
     * Klientga Refresh token'ni faqat /auth/refresh yo'li uchun HttpOnly cookie sifatida yozish.
     */
    public void setRefresh(HttpServletResponse response, String token, long maxAge) {
        Cookie cookie = new Cookie("refresh-token", token);
        cookie.setPath("/auth/refresh"); // Faqat shu endpointga yuboriladi
        cookie.setHttpOnly(true);
        cookie.setSecure(secured);
        cookie.setMaxAge((int) maxAge);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    /**
     * Tizimdan chiqishda (Logout) barcha cookie'larni yaroqsiz holatga keltirib tozalash.
     */
    public void clear(HttpServletResponse response) {
        setAccess(response, "", 0);
        setRefresh(response, "", 0);
    }
}