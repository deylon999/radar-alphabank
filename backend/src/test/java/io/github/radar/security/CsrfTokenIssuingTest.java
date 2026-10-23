package io.github.radar.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.net.http.HttpResponse;
import java.util.Arrays;
import java.util.List;
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
class CsrfTokenIssuingTest {
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
    void issues_token_for_x_csrf_token_header() throws Exception {
        HttpResponse<String> actualResponse = client.send(client.request("/auth/csrf"));

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValueSatisfying(
                contentType -> assertThat(contentType).startsWith("application/json"));
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualBody.get("token").asString()).isNotBlank();
        assertThat(actualBody.get("headerName").asString()).isEqualTo("X-CSRF-TOKEN");
    }

    @Test
    void creates_anonymous_session_with_cookie_attributes_from_contract() throws Exception {
        HttpResponse<String> actualResponse = client.send(client.request("/auth/csrf"));

        List<String> actualAttributes = Arrays.stream(actualResponse.headers().firstValue("Set-Cookie").orElseThrow().split(";"))
                .map(String::trim)
                .toList();
        assertThat(actualAttributes.getFirst()).startsWith("SESSION=");
        assertThat(actualAttributes).contains("Path=/", "Secure", "HttpOnly", "SameSite=Lax");
        assertThat(actualAttributes).noneMatch(attribute -> attribute.startsWith("Domain="));
    }

    @Test
    void keeps_existing_session_without_setting_new_cookie() throws Exception {
        String sessionCookie = client.sessionCookie(client.send(client.request("/auth/csrf")));

        HttpResponse<String> actualResponse = client.send(client.request("/auth/csrf").header("Cookie", sessionCookie));

        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().firstValue("Set-Cookie")).isEmpty();
        assertThat(jsonMapper.readTree(actualResponse.body()).get("token").asString()).isNotBlank();
    }
}
