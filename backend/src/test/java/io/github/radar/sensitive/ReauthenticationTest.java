package io.github.radar.sensitive;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.MutableClock;
import io.github.radar.MutableClockConfiguration;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
class ReauthenticationTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private MutableClock clock;

    @Autowired
    private JsonMapper jsonMapper;

    private ApiHttpClient client;

    private BrowserSession session;

    @BeforeEach
    void logIn() throws IOException, InterruptedException {
        clock.reset();
        client = new ApiHttpClient(port);
        session = client.registerAndLogin("ivan-" + UUID.randomUUID() + "@example.com", PASSWORD);
    }

    @Test
    void confirms_identity_for_five_minutes() throws Exception {
        HttpResponse<String> actualResponse = reauthenticate("{\"password\": \"" + PASSWORD + "\"}");

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        Instant actualConfirmedAt = Instant.parse(actualBody.get("confirmedAt").asString());
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualConfirmedAt).isEqualTo(clock.instant());
        assertThat(Instant.parse(actualBody.get("validUntil").asString()))
                .isEqualTo(actualConfirmedAt.plus(Duration.ofMinutes(5)));
    }

    @Test
    void ends_confirmation_no_later_than_session_limit() throws Exception {
        Instant loggedInAt = clock.instant();
        clock.advance(Duration.ofHours(8).minusMinutes(2));

        HttpResponse<String> actualResponse = reauthenticate("{\"password\": \"" + PASSWORD + "\"}");

        assertThat(Instant.parse(jsonMapper.readTree(actualResponse.body()).get("validUntil").asString()))
                .as("Подтверждение не переживает 8-часовой предел входа.")
                .isEqualTo(loggedInAt.plus(Duration.ofHours(8)));
    }

    @Test
    void rejects_wrong_password_and_keeps_user_logged_in() throws Exception {
        HttpResponse<String> actualResponse = reauthenticate("{\"password\": \"Wrong long passphrase here\"}");

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(401);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/invalid-reauthentication");
        assertThat(actualBody.get("title").asString()).isEqualTo("Подтверждение не пройдено");
        assertThat(client.send(session.apply(client.request("/me"))).statusCode())
                .as("Действующий вход сам по себе не завершается.")
                .isEqualTo(200);
    }

    @Test
    void requires_password() throws Exception {
        HttpResponse<String> actualResponse = reauthenticate("{}");

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualBody.get("errors").get(0).get("field").asString()).isEqualTo("password");
        assertThat(actualBody.get("errors").get(0).get("title").asString()).isEqualTo("REQUIRED");
    }

    private HttpResponse<String> reauthenticate(String body) throws IOException, InterruptedException {
        return client.postJson("/auth/reauthenticate", body, session);
    }
}
