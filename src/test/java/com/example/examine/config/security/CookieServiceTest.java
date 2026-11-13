package com.example.examine.config.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class CookieServiceTest {

    private final CookieService cookieService = new CookieService(false);

    @Test
    void setAccess_writesHttpOnlyCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieService.setAccess(response, "access-value", 900);

        Cookie cookie = response.getCookie("access-token");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo("access-value");
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSecure()).isFalse();
        assertThat(cookie.getMaxAge()).isEqualTo(900);
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Strict");
    }

    @Test
    void setRefresh_writesCookieScopedToRefreshPath() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieService.setRefresh(response, "refresh-value", 1000);

        Cookie cookie = response.getCookie("refresh-token");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo("refresh-value");
        assertThat(cookie.getPath()).isEqualTo("/auth/refresh");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getMaxAge()).isEqualTo(1000);
    }

    @Test
    void setAccess_withSecuredTrue_marksCookieSecure() {
        CookieService securedService = new CookieService(true);
        MockHttpServletResponse response = new MockHttpServletResponse();

        securedService.setAccess(response, "v", 10);

        assertThat(response.getCookie("access-token").getSecure()).isTrue();
    }

    @Test
    void clear_expiresBothCookies() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieService.clear(response);

        Cookie access = response.getCookie("access-token");
        Cookie refresh = response.getCookie("refresh-token");
        assertThat(access).isNotNull();
        assertThat(access.getValue()).isEmpty();
        assertThat(access.getMaxAge()).isZero();
        assertThat(refresh).isNotNull();
        assertThat(refresh.getValue()).isEmpty();
        assertThat(refresh.getMaxAge()).isZero();
    }
}
