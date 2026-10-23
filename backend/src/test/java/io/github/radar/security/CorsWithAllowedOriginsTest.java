package io.github.radar.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "radar.cors.allowed-origins=https://app.radar.example"
)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class CorsWithAllowedOriginsTest {
    @LocalServerPort
    private int port;

    private ApiHttpClient client;

    @BeforeEach
    void createClient() {
        client = new ApiHttpClient(port);
    }

    @Test
    void allows_credentialed_change_from_allowed_origin() throws Exception {
        HttpResponse<String> actualResponse = client.send(preflight("https://app.radar.example", "DELETE"));

        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().firstValue("Access-Control-Allow-Origin")).hasValue("https://app.radar.example");
        assertThat(actualResponse.headers().firstValue("Access-Control-Allow-Credentials")).hasValue("true");
        assertThat(listHeader(actualResponse, "Access-Control-Allow-Methods"))
                .containsExactlyInAnyOrder("GET", "POST", "PUT", "PATCH", "DELETE");
        assertThat(listHeader(actualResponse, "Access-Control-Allow-Headers"))
                .map(String::toLowerCase)
                .containsExactlyInAnyOrder("content-type", "x-csrf-token");
    }

    @Test
    void rejects_preflight_from_other_origin() throws Exception {
        HttpResponse<String> actualResponse = client.send(preflight("https://evil.example", "POST"));

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(actualResponse.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
    }

    private HttpRequest.Builder preflight(String origin, String method) {
        return client.request("/auth/logout")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .header("Origin", origin)
                .header("Access-Control-Request-Method", method)
                .header("Access-Control-Request-Headers", "content-type,x-csrf-token");
    }

    private List<String> listHeader(HttpResponse<String> response, String name) {
        return Arrays.stream(response.headers().firstValue(name).orElse("").split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }
}
