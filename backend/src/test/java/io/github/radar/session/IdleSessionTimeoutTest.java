package io.github.radar.session;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "radar.session.idle-timeout=1s"
)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class IdleSessionTimeoutTest {
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
    void ends_session_after_idle_timeout() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);

        Thread.sleep(1_500);

        assertThat(listSessions(session).statusCode()).isEqualTo(401);
    }

    @Test
    void extends_idle_timeout_with_each_request() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);
        Thread.sleep(600);
        assertThat(listSessions(session).statusCode()).isEqualTo(200);

        Thread.sleep(600);

        assertThat(listSessions(session).statusCode())
                .as("Запрос продлил срок бездействия.")
                .isEqualTo(200);
    }

    private HttpResponse<String> listSessions(BrowserSession session) throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/auth/sessions")));
    }
}
