package io.github.radar.session;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
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
class SessionListTest {
    private static final String PASSWORD = "My company has useful news";

    private static final String CHROME_ON_LINUX = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

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
    void lists_only_own_logged_in_sessions_and_marks_current() throws Exception {
        BrowserSession desktop = client.registerAndLogin(email, PASSWORD);
        client.login(email, PASSWORD, Map.of());
        client.registerAndLogin("maria-" + UUID.randomUUID() + "@example.com", PASSWORD);

        List<JsonNode> actualSessions = sessions(desktop);

        assertThat(actualSessions).hasSize(2);
        assertThat(actualSessions).filteredOn(session -> session.get("current").asBoolean()).hasSize(1);
        assertThat(actualSessions).extracting(session -> UUID.fromString(session.get("id").asString())).doesNotHaveDuplicates();
    }

    @Test
    void uses_public_ids_that_differ_from_cookie() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);
        String cookieSessionId = new String(
                Base64.getDecoder().decode(session.cookieHeader().substring("SESSION=".length())), StandardCharsets.UTF_8);

        List<JsonNode> actualSessions = sessions(session);

        assertThat(actualSessions).extracting(item -> item.get("id").asString())
                .doesNotContain(cookieSessionId)
                .allSatisfy(id -> assertThat(session.cookieHeader()).doesNotContain(id));
    }

    @Test
    void describes_browser_os_and_times_of_session() throws Exception {
        client.registerAndLogin(email, PASSWORD);
        BrowserSession chrome = client.login(email, PASSWORD, Map.of("User-Agent", CHROME_ON_LINUX));

        JsonNode actualCurrent = sessions(chrome).stream()
                .filter(session -> session.get("current").asBoolean())
                .findFirst()
                .orElseThrow();

        assertThat(actualCurrent.get("browser").asString()).isEqualTo("Chrome");
        assertThat(actualCurrent.get("os").asString()).isEqualTo("Linux");
        assertThat(Instant.parse(actualCurrent.get("authenticatedAt").asString()))
                .isBeforeOrEqualTo(Instant.parse(actualCurrent.get("lastAccessedAt").asString()));
    }

    @Test
    void reports_null_browser_and_os_for_unknown_client() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);

        JsonNode actualSession = sessions(session).getFirst();

        assertThat(actualSession.has("browser")).as("Поле передаётся и равно null.").isTrue();
        assertThat(actualSession.get("browser").isNull()).isTrue();
        assertThat(actualSession.get("os").isNull()).isTrue();
    }

    @Test
    void omits_session_after_logout() throws Exception {
        BrowserSession remaining = client.registerAndLogin(email, PASSWORD);
        BrowserSession leaving = client.login(email, PASSWORD, Map.of());

        client.send(leaving.apply(client.request("/auth/logout")).POST(HttpRequest.BodyPublishers.noBody()));

        assertThat(sessions(remaining)).singleElement()
                .satisfies(session -> assertThat(session.get("current").asBoolean()).isTrue());
    }

    private List<JsonNode> sessions(BrowserSession session) throws IOException, InterruptedException {
        HttpResponse<String> response = client.send(session.apply(client.request("/auth/sessions")));
        assertThat(response.statusCode()).isEqualTo(200);
        List<JsonNode> result = new ArrayList<>();
        jsonMapper.readTree(response.body()).get("sessions").forEach(result::add);
        return result;
    }
}
