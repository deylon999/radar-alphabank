package io.github.radar.controller;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
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
class LoginTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    private ApiHttpClient client;

    private String email;

    private String userId;

    @BeforeEach
    void registerUser() throws IOException, InterruptedException {
        client = new ApiHttpClient(port);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
        HttpResponse<String> registration = client.postJson("/auth/register", credentials(email, PASSWORD), client.openSession());
        userId = jsonMapper.readTree(registration.body()).get("id").asString();
    }

    @Test
    void logs_in_and_describes_authenticated_session() throws Exception {
        Instant before = Instant.now();

        HttpResponse<String> actualResponse = login(client.openSession(), email, PASSWORD);

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        Instant actualAuthenticatedAt = Instant.parse(actualBody.get("authenticatedAt").asString());
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualBody.get("status").asString()).isEqualTo("authenticated");
        assertThat(actualBody.get("user").get("id").asString()).isEqualTo(userId);
        assertThat(actualBody.get("user").get("email").asString()).isEqualTo(email);
        assertThat(actualBody.get("user").get("twoFactorEnabled").asBoolean()).isFalse();
        assertThat(actualAuthenticatedAt).isBetween(before.minusSeconds(1), Instant.now().plusSeconds(1));
        assertThat(actualBody.get("idleTimeoutSeconds").asInt()).isEqualTo(3600);
        assertThat(Instant.parse(actualBody.get("absoluteExpiresAt").asString()))
                .isEqualTo(actualAuthenticatedAt.plus(Duration.ofHours(8)));
    }

    @Test
    void accepts_email_in_other_letter_case() throws Exception {
        HttpResponse<String> actualResponse = login(client.openSession(), email.toUpperCase(Locale.ROOT), PASSWORD);

        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void issues_new_session_cookie_that_keeps_user_logged_in() throws Exception {
        BrowserSession anonymous = client.openSession();

        HttpResponse<String> loginResponse = login(anonymous, email, PASSWORD);
        BrowserSession loggedIn = client.continueSession(client.sessionCookie(loginResponse));
        HttpResponse<String> actualResponse = login(loggedIn, email, PASSWORD);

        assertThat(client.sessionCookie(loginResponse)).isNotEqualTo(anonymous.cookieHeader());
        assertThat(actualResponse.statusCode())
                .as("Повторный вход по новой cookie: сессия уже аутентифицирована.")
                .isEqualTo(409);
        assertThat(jsonMapper.readTree(actualResponse.body()).get("type").asString())
                .isEqualTo("/problems/invalid-security-state");
    }

    @Test
    void invalidates_cookie_issued_before_login() throws Exception {
        BrowserSession anonymous = client.openSession();

        login(anonymous, email, PASSWORD);
        HttpResponse<String> actualResponse = client.send(client.request("/auth/csrf")
                .header("Cookie", anonymous.cookieHeader()));

        assertThat(actualResponse.headers().firstValue("Set-Cookie"))
                .as("Сессии со старым ID больше нет, сервер начинает новую анонимную.")
                .isPresent();
    }

    @Test
    void requires_new_csrf_token_after_login() throws Exception {
        BrowserSession anonymous = client.openSession();

        HttpResponse<String> loginResponse = login(anonymous, email, PASSWORD);
        BrowserSession oldTokenWithNewCookie = anonymous.withCookie(client.sessionCookie(loginResponse));
        HttpResponse<String> actualResponse = login(oldTokenWithNewCookie, email, PASSWORD);

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(jsonMapper.readTree(actualResponse.body()).get("type").asString())
                .isEqualTo("/problems/invalid-csrf-token");
    }

    @Test
    void rejects_wrong_password_without_logging_in() throws Exception {
        BrowserSession session = client.openSession();

        HttpResponse<String> actualResponse = login(session, email, "Wrong long passphrase here");
        HttpResponse<String> nextLogin = login(session, email, PASSWORD);

        assertInvalidCredentials(actualResponse);
        assertThat(nextLogin.statusCode())
                .as("После отказа сессия осталась анонимной, поэтому вход возможен.")
                .isEqualTo(200);
    }

    @Test
    void rejects_unknown_email_exactly_like_wrong_password() throws Exception {
        HttpResponse<String> wrongPassword = login(client.openSession(), email, "Wrong long passphrase here");

        String unknownEmail = "nobody-" + UUID.randomUUID() + "@example.com";

        HttpResponse<String> actualResponse = login(client.openSession(), unknownEmail, PASSWORD);

        assertInvalidCredentials(actualResponse);
        assertThat(actualResponse.body()).isEqualTo(wrongPassword.body());
    }

    @Test
    void rejects_invalid_email_as_validation_problem() throws Exception {
        HttpResponse<String> actualResponse = login(client.openSession(), "ivan@", PASSWORD);

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualBody.get("errors").get(0).get("field").asString()).isEqualTo("email");
        assertThat(actualBody.get("errors").get(0).get("title").asString()).isEqualTo("INVALID_FORMAT");
    }

    private void assertInvalidCredentials(HttpResponse<String> actualResponse) {
        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(401);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/invalid-credentials");
        assertThat(actualBody.get("title").asString()).isEqualTo("Неверные учётные данные");
        assertThat(actualBody.get("status").asInt()).isEqualTo(401);
    }

    private HttpResponse<String> login(BrowserSession session, String userEmail, String password)
            throws IOException, InterruptedException {
        return client.postJson("/auth/login", credentials(userEmail, password), session);
    }

    private String credentials(String userEmail, String password) {
        return jsonMapper.writeValueAsString(Map.of("email", userEmail, "password", password));
    }
}
