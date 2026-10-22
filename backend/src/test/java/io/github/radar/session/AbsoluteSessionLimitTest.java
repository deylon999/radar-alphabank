package io.github.radar.session;

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
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
class AbsoluteSessionLimitTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private MutableClock clock;

    @Autowired
    private JsonMapper jsonMapper;

    private ApiHttpClient client;

    private String email;

    @BeforeEach
    void prepare() {
        clock.reset();
        client = new ApiHttpClient(port);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    void keeps_session_until_eight_hours_after_login() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);

        clock.advance(Duration.ofHours(8).minusSeconds(1));

        assertThat(listSessions(session).statusCode()).isEqualTo(200);
    }

    @Test
    void ends_session_eight_hours_after_login_and_removes_cookie() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);

        clock.advance(Duration.ofHours(8));
        HttpResponse<String> actualResponse = listSessions(session);

        assertThat(actualResponse.statusCode()).isEqualTo(401);
        assertThat(actualResponse.headers().firstValue("Set-Cookie")).hasValueSatisfying(
                cookie -> assertThat(cookie).startsWith("SESSION=;").contains("Max-Age=0"));
    }

    @Test
    void does_not_extend_limit_with_ordinary_requests() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);
        clock.advance(Duration.ofHours(4));
        assertThat(listSessions(session).statusCode()).isEqualTo(200);

        clock.advance(Duration.ofHours(4));

        assertThat(listSessions(session).statusCode())
                .as("Предел считается от входа, активность его не сдвигает.")
                .isEqualTo(401);
    }

    @Test
    void omits_sessions_past_limit_from_list() throws Exception {
        client.registerAndLogin(email, PASSWORD);
        clock.advance(Duration.ofHours(5));
        BrowserSession recent = client.login(email, PASSWORD, Map.of());

        clock.advance(Duration.ofHours(3));

        assertThat(jsonMapper.readTree(listSessions(recent).body()).get("sessions")).hasSize(1);
    }

    private HttpResponse<String> listSessions(BrowserSession session) throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/auth/sessions")));
    }
}
