package io.github.radar.session;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class LogoutTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    private ApiHttpClient client;

    private String email;

    @BeforeEach
    void prepare() {
        client = new ApiHttpClient(port);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    void ends_session_and_removes_cookie() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);

        HttpResponse<String> actualResponse = logout(session);

        List<String> actualCookie = Arrays.stream(actualResponse.headers().firstValue("Set-Cookie").orElseThrow().split(";"))
                .map(String::trim)
                .toList();
        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(actualResponse.body()).isEmpty();
        assertThat(actualCookie.getFirst()).isEqualTo("SESSION=");
        assertThat(actualCookie).contains("Max-Age=0", "Path=/", "Secure", "HttpOnly", "SameSite=Lax");
    }

    @Test
    void makes_copied_cookie_useless() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);

        logout(session);
        HttpResponse<String> actualResponse = logout(session);

        assertThat(actualResponse.statusCode())
                .as("Сессия завершена на сервере: её cookie больше не даёт входа.")
                .isIn(401, 403);
    }

    @Test
    void keeps_other_sessions_of_user() throws Exception {
        BrowserSession first = client.registerAndLogin(email, PASSWORD);
        BrowserSession second = client.login(email, PASSWORD, Map.of());

        logout(first);
        HttpResponse<String> actualResponse = logout(second);

        assertThat(actualResponse.statusCode())
                .as("Вторая сессия того же пользователя продолжает работать.")
                .isEqualTo(204);
    }

    private HttpResponse<String> logout(BrowserSession session) throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/auth/logout")).POST(HttpRequest.BodyPublishers.noBody()));
    }
}
