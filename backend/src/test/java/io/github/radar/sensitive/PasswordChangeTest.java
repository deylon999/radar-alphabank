package io.github.radar.sensitive;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.MutableClock;
import io.github.radar.MutableClockConfiguration;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpRequest;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
class PasswordChangeTest {
    private static final String PASSWORD = "My company has useful news";

    private static final String NEW_PASSWORD = "Another long company passphrase";

    @LocalServerPort
    private int port;

    @Autowired
    private MutableClock clock;

    @Autowired
    private JsonMapper jsonMapper;

    private ApiHttpClient client;

    private String email;

    private BrowserSession session;

    @BeforeEach
    void logIn() throws IOException, InterruptedException {
        clock.reset();
        client = new ApiHttpClient(port);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
        session = client.registerAndLogin(email, PASSWORD);
    }

    @Test
    void changes_password_and_issues_new_session_cookie() throws Exception {
        reauthenticate(session);

        HttpResponse<String> actualResponse = changePassword(session, NEW_PASSWORD);

        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(actualResponse.body()).isEmpty();
        assertThat(client.sessionCookie(actualResponse)).isNotEqualTo(session.cookieHeader());
        assertThat(loginStatus(NEW_PASSWORD)).isEqualTo(200);
        assertThat(loginStatus(PASSWORD)).as("Старый пароль больше не подходит.").isEqualTo(401);
    }

    @Test
    void ends_other_sessions_and_keeps_current_with_new_cookie() throws Exception {
        BrowserSession other = client.login(email, PASSWORD, Map.of());
        reauthenticate(session);

        HttpResponse<String> actualResponse = changePassword(session, NEW_PASSWORD);

        BrowserSession current = client.continueSession(client.sessionCookie(actualResponse));
        assertThat(listSessions(other).statusCode()).as("Остальные сессии завершены.").isEqualTo(401);
        assertThat(listSessions(session).statusCode()).as("Прежний ID текущей сессии больше не действует.").isEqualTo(401);
        assertThat(listSessions(current).statusCode()).isEqualTo(200);
        assertThat(jsonMapper.readTree(listSessions(current).body()).get("sessions")).hasSize(1);
    }

    @Test
    void requires_new_csrf_token_after_change() throws Exception {
        reauthenticate(session);

        HttpResponse<String> response = changePassword(session, NEW_PASSWORD);
        HttpResponse<String> actualResponse = reauthenticate(session.withCookie(client.sessionCookie(response)));

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(jsonMapper.readTree(actualResponse.body()).get("type").asString()).isEqualTo("/problems/invalid-csrf-token");
    }

    @Test
    void resets_confirmation_of_identity() throws Exception {
        reauthenticate(session);
        BrowserSession current = client.continueSession(client.sessionCookie(changePassword(session, NEW_PASSWORD)));

        HttpResponse<String> actualResponse = changePassword(current, PASSWORD);

        assertReauthenticationRequired(actualResponse);
    }

    @Test
    void requires_confirmation_of_identity_and_keeps_password() throws Exception {
        HttpResponse<String> actualResponse = changePassword(session, NEW_PASSWORD);

        assertReauthenticationRequired(actualResponse);
        assertThat(loginStatus(PASSWORD)).isEqualTo(200);
    }

    @Test
    void rejects_short_password_as_validation_problem() throws Exception {
        reauthenticate(session);

        HttpResponse<String> actualResponse = changePassword(session, "Short password");

        assertFieldIssue(actualResponse, "OUT_OF_RANGE");
        assertThat(loginStatus(PASSWORD)).isEqualTo(200);
    }

    @Test
    void rejects_leaked_password() throws Exception {
        reauthenticate(session);

        assertFieldIssue(changePassword(session, "1q2w3e4r5t6y7u8i"), "COMPROMISED_PASSWORD");
    }

    @Test
    void keeps_absolute_limit_counted_from_original_login() throws Exception {
        clock.advance(Duration.ofHours(7));
        reauthenticate(session);
        BrowserSession current = client.continueSession(client.sessionCookie(changePassword(session, NEW_PASSWORD)));

        clock.advance(Duration.ofHours(1));

        assertThat(listSessions(current).statusCode()).isEqualTo(401);
    }

    private void assertReauthenticationRequired(HttpResponse<String> actualResponse) {
        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(jsonMapper.readTree(actualResponse.body()).get("type").asString())
                .isEqualTo("/problems/reauthentication-required");
    }

    private void assertFieldIssue(HttpResponse<String> actualResponse, String code) {
        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualBody.get("errors").get(0).get("field").asString()).isEqualTo("newPassword");
        assertThat(actualBody.get("errors").get(0).get("title").asString()).isEqualTo(code);
    }

    private HttpResponse<String> reauthenticate(BrowserSession target) throws IOException, InterruptedException {
        return client.postJson("/auth/reauthenticate", "{\"password\": \"" + PASSWORD + "\"}", target);
    }

    private HttpResponse<String> changePassword(BrowserSession target, String newPassword)
            throws IOException, InterruptedException {
        return client.send(target.apply(client.request("/auth/password"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString("{\"newPassword\": \"" + newPassword + "\"}")));
    }

    private HttpResponse<String> listSessions(BrowserSession target) throws IOException, InterruptedException {
        return client.send(target.apply(client.request("/auth/sessions")));
    }

    private int loginStatus(String password) throws IOException, InterruptedException {
        return client.postJson("/auth/login",
                jsonMapper.writeValueAsString(Map.of("email", email, "password", password)), client.openSession()).statusCode();
    }
}
