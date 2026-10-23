package io.github.radar.controller;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "radar.rate-limit.registration.ip-attempts=2",
            "radar.rate-limit.registration.window=1h"
        }
)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class RegistrationAttemptLimitTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private StringRedisTemplate redis;

    @Autowired
    private JdbcClient jdbcClient;

    private ApiHttpClient client;

    @BeforeEach
    void cleanCounters() {
        redis.delete(redis.keys("radar:attempts:*"));
        client = new ApiHttpClient(port);
    }

    @Test
    void blocks_registration_from_same_ip_after_limit_without_creating_user() throws Exception {
        assertThat(register("first-" + UUID.randomUUID() + "@example.com").statusCode()).isEqualTo(201);
        assertThat(register("second-" + UUID.randomUUID() + "@example.com").statusCode()).isEqualTo(201);
        String blockedEmail = "third-" + UUID.randomUUID() + "@example.com";

        HttpResponse<String> actualResponse = register(blockedEmail);

        assertThat(actualResponse.statusCode()).isEqualTo(429);
        assertThat(actualResponse.headers().firstValue("Retry-After")).hasValueSatisfying(
                retryAfter -> assertThat(Integer.parseInt(retryAfter)).isBetween(1, 60 * 60));
        assertThat(jsonMapper.readTree(actualResponse.body()).get("type").asString()).isEqualTo("/problems/too-many-attempts");
        assertThat(jdbcClient.sql("SELECT count(*) FROM users WHERE email = :email")
                .param("email", blockedEmail).query(Integer.class).single()).isZero();
    }

    private HttpResponse<String> register(String email) throws IOException, InterruptedException {
        return client.postJson("/auth/register",
                jsonMapper.writeValueAsString(Map.of("email", email, "password", PASSWORD)), client.openSession());
    }
}
