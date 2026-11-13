package com.example.examine.service;

import com.example.examine.constant.ResponseType;
import com.example.examine.exception.CustomBadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class FaceServiceTest {

    private MockRestServiceServer server;
    private FaceService faceService;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        faceService = new FaceService(builder.build());
        ReflectionTestUtils.setField(faceService, "baseUrl", "http://localhost:8000");
    }

    @Test
    void embed_returnsServiceResponse() {
        server.expect(requestTo("http://localhost:8000/embed"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"embedding\":[0.1,0.2]}", MediaType.APPLICATION_JSON));

        Map<String, Object> result = faceService.embed("img");

        assertThat(result).containsKey("embedding");
        server.verify();
    }

    @Test
    void identifyByEmbedding_returnsServiceResponse() {
        server.expect(requestTo("http://localhost:8000/identify"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"candidates\":[]}", MediaType.APPLICATION_JSON));

        Map<String, Object> result = faceService.identifyByEmbedding(List.of(0.1));

        assertThat(result).containsKey("candidates");
        server.verify();
    }

    @Test
    void enrollEmbedding_returnsServiceResponse() {
        server.expect(requestTo("http://localhost:8000/enroll"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"ok\":true}", MediaType.APPLICATION_JSON));

        Map<String, Object> result = faceService.enrollEmbedding("s1", List.of(0.1));

        assertThat(result).containsEntry("ok", true);
        server.verify();
    }

    @Test
    void rebuild_returnsServiceResponse() {
        server.expect(requestTo("http://localhost:8000/rebuild"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"ok\":true}", MediaType.APPLICATION_JSON));

        Map<String, Object> result = faceService.rebuild(List.of());

        assertThat(result).containsEntry("ok", true);
        server.verify();
    }

    @Test
    void verifyPair_returnsServiceResponse() {
        server.expect(requestTo("http://localhost:8000/verify-pair"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"match\":true}", MediaType.APPLICATION_JSON));

        Map<String, Object> result = faceService.verifyPair("a", "b");

        assertThat(result).containsEntry("match", true);
        server.verify();
    }

    @Test
    void embed_whenServiceFails_throwsUnavailable() {
        server.expect(requestTo("http://localhost:8000/embed"))
                .andRespond(withServerError());

        assertThatThrownBy(() -> faceService.embed("img"))
                .isInstanceOf(CustomBadRequestException.class)
                .hasMessage(ResponseType.FACE_SERVICE_UNAVAILABLE.getMessageFormat());
    }

    @Test
    void deleteStudent_swallowsErrors() {
        server.expect(requestTo("http://localhost:8000/student/s1"))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withServerError());

        faceService.deleteStudent("s1");

        server.verify();
    }

    @Test
    void health_returnsTrueWhenServiceResponds() {
        server.expect(requestTo("http://localhost:8000/health"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess());

        assertThat(faceService.health()).isTrue();
        server.verify();
    }

    @Test
    void health_returnsFalseWhenServiceFails() {
        server.expect(requestTo("http://localhost:8000/health"))
                .andRespond(withServerError());

        assertThat(faceService.health()).isFalse();
    }
}
