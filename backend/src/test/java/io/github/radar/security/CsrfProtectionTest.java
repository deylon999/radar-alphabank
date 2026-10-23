package io.github.radar.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class CsrfProtectionTest {
    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    private ApiHttpClient client;

    @BeforeEach
    void createClient() {
        client = new ApiHttpClient(port);
    }

    @Test
    void rejects_change_without_token() throws Exception {
        String sessionCookie = client.sessionCookie(client.send(client.request("/auth/csrf")));

        HttpResponse<String> actualResponse = client.send(logout().header("Cookie", sessionCookie));

        assertInvalidCsrfProblem(actualResponse);
    }

    @Test
    void rejects_change_with_token_of_other_session() throws Exception {
        String foreignToken = tokenOf(client.send(client.request("/auth/csrf")));
        String sessionCookie = client.sessionCookie(client.send(client.request("/auth/csrf")));

        HttpResponse<String> actualResponse = client.send(logout()
                .header("Cookie", sessionCookie)
                .header("X-CSRF-TOKEN", foreignToken));

        assertInvalidCsrfProblem(actualResponse);
    }

    @Test
    void rejects_change_with_malformed_token() throws Exception {
        String sessionCookie = client.sessionCookie(client.send(client.request("/auth/csrf")));

        HttpResponse<String> actualResponse = client.send(logout()
                .header("Cookie", sessionCookie)
                .header("X-CSRF-TOKEN", "00000000-0000-0000-0000-000000000000"));

        assertInvalidCsrfProblem(actualResponse);
    }

    @Test
    void rejects_change_without_session() throws Exception {
        HttpResponse<String> actualResponse = client.send(logout());

        assertInvalidCsrfProblem(actualResponse);
    }

    @Test
    void passes_change_with_token_of_own_session_to_authentication_check() throws Exception {
        HttpResponse<String> csrfResponse = client.send(client.request("/auth/csrf"));

        HttpResponse<String> actualResponse = client.send(logout()
                .header("Cookie", client.sessionCookie(csrfResponse))
                .header("X-CSRF-TOKEN", tokenOf(csrfResponse)));

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode())
                .as("С верным токеном запрос проходит CSRF и останавливается на проверке входа.")
                .isEqualTo(401);
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/authentication-required");
    }

    private HttpRequest.Builder logout() {
        return client.request("/auth/logout").POST(HttpRequest.BodyPublishers.noBody());
    }

    private String tokenOf(HttpResponse<String> csrfResponse) {
        return jsonMapper.readTree(csrfResponse.body()).get("token").asString();
    }

    private void assertInvalidCsrfProblem(HttpResponse<String> actualResponse) {
        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/invalid-csrf-token");
        assertThat(actualBody.get("title").asString()).isEqualTo("Неверный CSRF-токен");
        assertThat(actualBody.get("status").asInt()).isEqualTo(403);
        assertThat(actualBody.get("detail").asString()).isNotBlank();
    }
}
