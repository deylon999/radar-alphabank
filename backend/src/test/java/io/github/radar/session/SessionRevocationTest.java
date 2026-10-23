package io.github.radar.session;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class SessionRevocationTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    private ApiHttpClient client;

    private String email;

    @BeforeEach
    void prepare() {
        client = new ApiHttpClient(port);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    void ends_other_session_by_public_id_and_keeps_cookie_of_current() throws Exception {
        BrowserSession current = client.registerAndLogin(email, PASSWORD);
        BrowserSession other = client.login(email, PASSWORD, Map.of());

        HttpResponse<String> actualResponse = revoke(current, ownSessionId(other));

        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(actualResponse.headers().firstValue("Set-Cookie")).isEmpty();
        assertThat(listSessions(other).statusCode()).as("Завершённая сессия больше не даёт входа.").isEqualTo(401);
        assertThat(listSessions(current).statusCode()).isEqualTo(200);
    }

    @Test
    void ends_current_session_and_removes_its_cookie() throws Exception {
        BrowserSession current = client.registerAndLogin(email, PASSWORD);

        HttpResponse<String> actualResponse = revoke(current, ownSessionId(current));

        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(actualResponse.headers().firstValue("Set-Cookie")).hasValueSatisfying(
                cookie -> assertThat(cookie).startsWith("SESSION=;").contains("Max-Age=0"));
        assertThat(listSessions(current).statusCode()).isEqualTo(401);
    }

    @Test
    void hides_session_of_other_user_behind_not_found() throws Exception {
        BrowserSession ivan = client.registerAndLogin(email, PASSWORD);
        BrowserSession maria = client.registerAndLogin("maria-" + UUID.randomUUID() + "@example.com", PASSWORD);

        HttpResponse<String> actualResponse = revoke(ivan, ownSessionId(maria));

        assertSessionNotFound(actualResponse);
        assertThat(listSessions(maria).statusCode()).as("Чужая сессия не завершена.").isEqualTo(200);
    }

    @Test
    void answers_unknown_session_exactly_like_foreign_one() throws Exception {
        BrowserSession ivan = client.registerAndLogin(email, PASSWORD);
        BrowserSession maria = client.registerAndLogin("maria-" + UUID.randomUUID() + "@example.com", PASSWORD);
        HttpResponse<String> foreign = revoke(ivan, ownSessionId(maria));

        HttpResponse<String> actualResponse = revoke(ivan, UUID.randomUUID().toString());

        assertSessionNotFound(actualResponse);
        assertThat(actualResponse.body()).isEqualTo(foreign.body());
    }

    @Test
    void rejects_malformed_session_id_as_bad_request() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);

        HttpResponse<String> actualResponse = revoke(session, "not-a-uuid");

        assertThat(actualResponse.statusCode()).isEqualTo(400);
        assertThat(jsonMapper.readTree(actualResponse.body()).get("type").asString()).isEqualTo("/problems/malformed-request");
    }

    @Test
    void ends_all_other_sessions_and_keeps_current() throws Exception {
        BrowserSession current = client.registerAndLogin(email, PASSWORD);
        BrowserSession phone = client.login(email, PASSWORD, Map.of());
        BrowserSession laptop = client.login(email, PASSWORD, Map.of());

        HttpResponse<String> actualResponse = revokeOthers(current);

        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(actualResponse.headers().firstValue("Set-Cookie")).isEmpty();
        assertThat(listSessions(phone).statusCode()).isEqualTo(401);
        assertThat(listSessions(laptop).statusCode()).isEqualTo(401);
        assertThat(jsonMapper.readTree(listSessions(current).body()).get("sessions")).hasSize(1);
    }

    @Test
    void accepts_ending_other_sessions_when_there_are_none() throws Exception {
        BrowserSession current = client.registerAndLogin(email, PASSWORD);

        HttpResponse<String> actualResponse = revokeOthers(current);

        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(listSessions(current).statusCode()).isEqualTo(200);
    }

    private void assertSessionNotFound(HttpResponse<String> actualResponse) {
        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(404);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/session-not-found");
        assertThat(actualBody.get("title").asString()).isEqualTo("Сессия не найдена");
    }

    private String ownSessionId(BrowserSession session) throws IOException, InterruptedException {
        for (JsonNode item : jsonMapper.readTree(listSessions(session).body()).get("sessions")) {
            if (item.get("current").asBoolean()) {
                return item.get("id").asString();
            }
        }
        throw new IllegalStateException("Текущая сессия не найдена в списке");
    }

    private HttpResponse<String> listSessions(BrowserSession session) throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/auth/sessions")));
    }

    private HttpResponse<String> revoke(BrowserSession session, String id) throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/auth/sessions/" + id)).DELETE());
    }

    private HttpResponse<String> revokeOthers(BrowserSession session) throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/auth/sessions/revoke-others"))
                .POST(HttpRequest.BodyPublishers.noBody()));
    }
}
