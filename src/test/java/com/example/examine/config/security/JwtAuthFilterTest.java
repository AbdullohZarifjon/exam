package com.example.examine.config.security;

import com.example.examine.constant.TokenType;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private JwtAuthFilter filter;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void noCookie_passesThroughWithoutAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(request.getAttribute("jwtDto")).isNull();
    }

    @Test
    void validToken_setsAuthenticationAndRequestAttribute() throws Exception {
        JwtTokenDto dto = new JwtTokenDto("id-1", "admin", "ADMIN", "User", null, 0);
        when(jwtService.validate("token", TokenType.ACCESS)).thenReturn(dto);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("access-token", "token"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(request.getAttribute("jwtDto")).isEqualTo(dto);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(dto);
    }

    @Test
    void invalidToken_returnsUnauthorizedAndStopsChain() throws Exception {
        when(jwtService.validate("bad", TokenType.ACCESS)).thenThrow(new JwtException("bad"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("access-token", "bad"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("unauthorized");
        assertThat(chain.getRequest()).isNull();
    }
}
