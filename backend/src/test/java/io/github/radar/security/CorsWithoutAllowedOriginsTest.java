package io.github.radar.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "radar.cors.allowed-origins="
)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class CorsWithoutAllowedOriginsTest {
    @LocalServerPort
    private int port;

    @Test
    void grants_no_cross_origin_access() throws Exception {
        ApiHttpClient client = new ApiHttpClient(port);

        HttpResponse<String> actualResponse = client.send(client.request("/auth/csrf")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .header("Origin", "https://app.radar.example")
                .header("Access-Control-Request-Method", "GET"));

        assertThat(actualResponse.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
    }

    @Test
    void serves_request_with_origin_header_without_rejecting_it() throws Exception {
        ApiHttpClient client = new ApiHttpClient(port);

        HttpResponse<String> actualResponse = client.send(client.request("/auth/csrf")
                .header("Origin", "https://radar.example"));

        assertThat(actualResponse.statusCode())
                .as("За прокси браузер шлёт Origin и в запросах со своего сайта; API не должен их отклонять.")
                .isEqualTo(200);
        assertThat(actualResponse.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
    }
}
