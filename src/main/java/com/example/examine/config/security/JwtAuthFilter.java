package com.example.examine.config.security;

import com.example.examine.constant.TokenType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.WebUtils;

import java.io.IOException;
import java.util.List;

/**
 * JwtAuthFilter - Har bir kiruvchi HTTP so'rovni tutib olib, brauzerdagi cookie'dan
 * access-token'ni o'qiydigan va uni tekshirib Spring Security kontekstiga o'rnatuvchi filtr.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        Cookie cookie = WebUtils.getCookie(request, "access-token");
        if (cookie == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            JwtTokenDto jwtDto = jwtService.validate(cookie.getValue(), TokenType.ACCESS);

            String roleName = jwtDto.roleName() != null ? jwtDto.roleName() : "";
            List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(roleName));

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(jwtDto, null, authorities);

            SecurityContextHolder.getContext().setAuthentication(authentication);
            request.setAttribute("jwtDto", jwtDto);

        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"code\":8,\"message\":\"unauthorized\",\"payload\":null}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}