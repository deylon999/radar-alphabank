package io.github.radar.controller;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.InetAddress;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "radar.rate-limit.login.email-attempts=3",
            "radar.rate-limit.login.ip-attempts=5",
            "radar.rate-limit.login.window=15m"
        }
)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
@ExtendWith(OutputCaptureExtension.class)
class LoginAttemptLimitTest {
    private static final String LOOPBACK = InetAddress.getLoopbackAddress().getHostAddress();

    private static final String PASSWORD = "My company has useful news";

    private static final String WRONG_PASSWORD = "Wrong long passphrase here";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private StringRedisTemplate redis;

    private ApiHttpClient client;

    private String email;

    @BeforeEach
    void registerUserWithCleanCounters() throws IOException, InterruptedException {
        redis.delete(redis.keys("radar:attempts:*"));
        client = new ApiHttpClient(port);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
        client.postJson("/auth/register", credentials(email, PASSWORD), client.openSession());
    }

    @Test
    void blocks_email_after_failed_attempts_even_for_correct_password() throws Exception {
        failTimes(email, 3);

        HttpResponse<String> actualResponse = login(email, PASSWORD);

        assertTooManyAttempts(actualResponse, 15 * 60);
    }

    @Test
    void limits_unknown_email_like_existing_one() throws Exception {
        String unknownEmail = "nobody-" + UUID.randomUUID() + "@example.com";
        failTimes(unknownEmail, 3);

        HttpResponse<String> actualResponse = login(unknownEmail, PASSWORD);

        assertTooManyAttempts(actualResponse, 15 * 60);
    }

    @Test
    void resets_email_counter_after_successful_login() throws Exception {
        failTimes(email, 2);
        assertThat(login(email, PASSWORD).statusCode()).isEqualTo(200);
        failTimes(email, 2);

        HttpResponse<String> actualResponse = login(email, WRONG_PASSWORD);

        assertThat(actualResponse.statusCode())
                .as("После успешного входа неудачные попытки по email считаются заново.")
                .isEqualTo(401);
    }

    @Test
    void blocks_ip_after_failed_attempts_on_different_emails() throws Exception {
        for (int attempt = 0; attempt < 5; attempt++) {
            failTimes("guess-" + UUID.randomUUID() + "@example.com", 1);
        }

        HttpResponse<String> actualResponse = login(email, PASSWORD);

        assertTooManyAttempts(actualResponse, 15 * 60);
    }

    @Test
    void ignores_forwarded_for_header_when_counting_ip() throws Exception {
        for (int attempt = 0; attempt < 5; attempt++) {
            client.send(client.openSession().apply(client.request("/auth/login"))
                    .header("Content-Type", "application/json")
                    .header("X-Forwarded-For", "203.0.113." + attempt)
                    .POST(HttpRequest.BodyPublishers.ofString(
                            credentials("guess-" + UUID.randomUUID() + "@example.com", WRONG_PASSWORD))));
        }

        HttpResponse<String> actualResponse = login(email, PASSWORD);

        assertTooManyAttempts(actualResponse, 15 * 60);
    }

    @Test
    void counts_failed_reauthentication_toward_login_limit() throws Exception {
        BrowserSession loggedIn = client.login(email, PASSWORD, Map.of());
        for (int attempt = 0; attempt < 3; attempt++) {
            client.postJson("/auth/reauthenticate", "{\"password\": \"" + WRONG_PASSWORD + "\"}", loggedIn);
        }

        HttpResponse<String> actualResponse = login(email, PASSWORD);

        assertTooManyAttempts(actualResponse, 15 * 60);
    }

    @Test
    void resets_email_counter_after_successful_reauthentication() throws Exception {
        BrowserSession loggedIn = client.login(email, PASSWORD, Map.of());
        failTimes(email, 2);
        client.postJson("/auth/reauthenticate", "{\"password\": \"" + PASSWORD + "\"}", loggedIn);
        failTimes(email, 2);

        HttpResponse<String> actualResponse = login(email, WRONG_PASSWORD);

        assertThat(actualResponse.statusCode())
                .as("Успешное подтверждение личности, как и вход, сбрасывает счётчик email.")
                .isEqualTo(401);
    }

    @Test
    void logs_exceeded_limit_as_security_warning_with_masked_email(CapturedOutput output) throws Exception {
        failTimes(email, 3);

        login(email, PASSWORD);

        assertThat(output.getOut().lines().filter(line -> line.contains("Превышен лимит попыток входа")))
                .singleElement().asString().contains("WARN", "radar.security", "i***@example.com", LOOPBACK);
    }

    private void assertTooManyAttempts(HttpResponse<String> actualResponse, int windowSeconds) {
        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(429);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualResponse.headers().firstValue("Retry-After")).hasValueSatisfying(
                retryAfter -> assertThat(Integer.parseInt(retryAfter)).isBetween(1, windowSeconds));
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/too-many-attempts");
        assertThat(actualBody.get("title").asString()).isEqualTo("Слишком много попыток");
        assertThat(actualBody.get("status").asInt()).isEqualTo(429);
    }

    private void failTimes(String userEmail, int times) throws IOException, InterruptedException {
        for (int attempt = 0; attempt < times; attempt++) {
            assertThat(login(userEmail, WRONG_PASSWORD).statusCode()).isEqualTo(401);
        }
    }

    private HttpResponse<String> login(String userEmail, String password) throws IOException, InterruptedException {
        return client.postJson("/auth/login", credentials(userEmail, password), client.openSession());
    }

    private String credentials(String userEmail, String password) {
        return jsonMapper.writeValueAsString(Map.of("email", userEmail, "password", password));
    }
}
