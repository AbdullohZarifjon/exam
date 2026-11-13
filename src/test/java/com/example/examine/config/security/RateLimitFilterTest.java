package com.example.examine.config.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    private MockHttpServletRequest requestFrom(String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(ip);
        return request;
    }

    @Test
    void allowsRequestsUnderTheLimit() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();

        for (int i = 0; i < 120; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilter(requestFrom("10.0.0.1"), response, chain);

            assertThat(response.getStatus()).isEqualTo(200);
            assertThat(chain.getRequest()).isNotNull();
        }
    }

    @Test
    void blocksRequestOverTheLimit() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();

        for (int i = 0; i < 120; i++) {
            filter.doFilter(requestFrom("10.0.0.2"), new MockHttpServletResponse(), new MockFilterChain());
        }

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(requestFrom("10.0.0.2"), response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getContentAsString()).contains("rate limited");
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void limitsAreTrackedPerIp() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();

        for (int i = 0; i < 120; i++) {
            filter.doFilter(requestFrom("10.0.0.3"), new MockHttpServletResponse(), new MockFilterChain());
        }

        MockHttpServletResponse otherIpResponse = new MockHttpServletResponse();
        MockFilterChain otherIpChain = new MockFilterChain();
        filter.doFilter(requestFrom("10.0.0.4"), otherIpResponse, otherIpChain);

        assertThat(otherIpResponse.getStatus()).isEqualTo(200);
        assertThat(otherIpChain.getRequest()).isNotNull();
    }
}
