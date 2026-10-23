package io.github.radar.logging;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.MutableClock;
import io.github.radar.MutableClockConfiguration;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpRequest;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
@ExtendWith(OutputCaptureExtension.class)
class SessionEventLoggingTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private MutableClock clock;

    private ApiHttpClient client;

    private String email;

    @BeforeEach
    void prepare() {
        clock.reset();
        client = new ApiHttpClient(port);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    void logs_logout_with_user_id(CapturedOutput output) throws Exception {
        String userId = jsonMapper.readTree(client.postJson("/auth/register",
                jsonMapper.writeValueAsString(Map.of("email", email, "password", PASSWORD)), client.openSession()).body())
                .get("id").asString();
        BrowserSession session = client.login(email, PASSWORD, Map.of());

        client.send(session.apply(client.request("/auth/logout")).POST(HttpRequest.BodyPublishers.noBody()));

        assertThat(securityLines(output, "Выход")).singleElement().asString().contains("INFO", userId);
    }

    @Test
    void logs_revoked_session_with_its_public_id(CapturedOutput output) throws Exception {
        BrowserSession current = client.registerAndLogin(email, PASSWORD);
        BrowserSession other = client.login(email, PASSWORD, Map.of());
        String otherId = currentSessionId(other);

        client.send(current.apply(client.request("/auth/sessions/" + otherId)).DELETE());

        assertThat(securityLines(output, "Завершена сессия")).singleElement().asString().contains("INFO", otherId);
    }

    @Test
    void logs_revocation_of_other_sessions(CapturedOutput output) throws Exception {
        BrowserSession current = client.registerAndLogin(email, PASSWORD);

        client.send(current.apply(client.request("/auth/sessions/revoke-others")).POST(HttpRequest.BodyPublishers.noBody()));

        assertThat(securityLines(output, "Завершены остальные сессии")).singleElement().asString().contains("INFO");
    }

    @Test
    void logs_session_ended_by_absolute_limit(CapturedOutput output) throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);
        clock.advance(Duration.ofHours(8));

        client.send(session.apply(client.request("/auth/sessions")));

        assertThat(securityLines(output, "абсолютному пределу")).singleElement().asString().contains("INFO");
    }

    private String currentSessionId(BrowserSession session) throws IOException, InterruptedException {
        String body = client.send(session.apply(client.request("/auth/sessions"))).body();
        JsonNode sessions = jsonMapper.readTree(body).get("sessions");
        for (JsonNode item : sessions) {
            if (item.get("current").asBoolean()) {
                return item.get("id").asString();
            }
        }
        throw new IllegalStateException("Текущая сессия не найдена");
    }

    private Stream<String> securityLines(CapturedOutput output, String event) {
        return output.getOut().lines().filter(line -> line.contains("radar.security") && line.contains(event));
    }
}
