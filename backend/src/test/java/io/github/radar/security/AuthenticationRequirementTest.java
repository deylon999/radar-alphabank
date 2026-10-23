package io.github.radar.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
class AuthenticationRequirementTest {
    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    private ApiHttpClient client;

    @BeforeEach
    void createClient() {
        client = new ApiHttpClient(port);
    }

    @Test
    void rejects_protected_request_without_login_as_problem() throws Exception {
        HttpResponse<String> actualResponse = client.send(client.request("/auth/sessions"));

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(401);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualResponse.headers().firstValue("WWW-Authenticate"))
                .as("Basic-аутентификации нет, браузер не должен показывать окно входа.")
                .isEmpty();
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/authentication-required");
        assertThat(actualBody.get("title").asString()).isEqualTo("Нужно войти");
        assertThat(actualBody.get("status").asInt()).isEqualTo(401);
    }

    @Test
    void reports_unsupported_content_type_of_public_operation_without_asking_to_log_in() throws Exception {
        BrowserSession session = client.openSession();

        HttpResponse<String> actualResponse = client.send(session.apply(client.request("/auth/register"))
                .header("Content-Type", "text/plain")
                .POST(HttpRequest.BodyPublishers.ofString("ivan@example.com")));

        assertThat(actualResponse.statusCode())
                .as("Ошибка запроса к публичной операции не должна превращаться в 401 на странице /error.")
                .isEqualTo(415);
    }

    @Test
    void does_not_serve_framework_login_page() throws Exception {
        HttpResponse<String> actualResponse = client.send(client.request("/login"));

        assertThat(actualResponse.statusCode()).isEqualTo(401);
    }

    @Test
    void does_not_serve_framework_logout_endpoint() throws Exception {
        HttpResponse<String> csrfResponse = client.send(client.request("/auth/csrf"));

        HttpResponse<String> actualResponse = client.send(client.request("/logout")
                .POST(HttpRequest.BodyPublishers.noBody())
                .header("Cookie", client.sessionCookie(csrfResponse))
                .header("X-CSRF-TOKEN", jsonMapper.readTree(csrfResponse.body()).get("token").asString()));

        assertThat(actualResponse.statusCode())
                .as("Выход по контракту — POST /auth/logout; стандартный /logout Spring Security не нужен.")
                .isEqualTo(401);
    }
}
