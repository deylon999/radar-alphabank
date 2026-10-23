package io.github.radar.logging;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
@ExtendWith(OutputCaptureExtension.class)
class RequestLoggingTest {
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
    void logs_handled_request_with_route_and_status_but_without_secrets(CapturedOutput output) throws Exception {
        HttpResponse<String> response = client.send(client.request("/auth/csrf"));

        assertThat(output).contains("GET /auth/csrf -> 200");
        assertThat(output).doesNotContain(tokenOf(response), sessionValueOf(response));
    }

    @Test
    void marks_request_records_with_request_id(CapturedOutput output) throws Exception {
        client.send(client.request("/auth/csrf"));

        assertThat(output.getOut().lines().filter(line -> line.contains("GET /auth/csrf -> 200")))
                .singleElement()
                .asString()
                .containsPattern("\\[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\]");
    }

    @Test
    void logs_csrf_rejection_as_security_warning_without_token_values(CapturedOutput output) throws Exception {
        HttpResponse<String> csrfResponse = client.send(client.request("/auth/csrf"));

        client.send(client.request("/auth/logout")
                .POST(HttpRequest.BodyPublishers.noBody())
                .header("Cookie", client.sessionCookie(csrfResponse))
                .header("X-CSRF-TOKEN", "forged-token-value"));

        assertThat(output.getOut().lines().filter(line -> line.contains("CSRF")))
                .singleElement()
                .asString()
                .contains("WARN", "radar.security", "POST /api/auth/logout");
        assertThat(output).doesNotContain("forged-token-value", tokenOf(csrfResponse), sessionValueOf(csrfResponse));
    }

    @Test
    void logs_request_without_login_as_security_event(CapturedOutput output) throws Exception {
        client.send(client.request("/auth/sessions"));

        assertThat(output.getOut().lines().filter(line -> line.contains("без входа")))
                .singleElement()
                .asString()
                .contains("INFO", "radar.security", "GET /api/auth/sessions");
    }

    @Test
    void shortens_long_path_in_security_log(CapturedOutput output) throws Exception {
        String longSegment = "a".repeat(300);

        client.send(client.request("/" + longSegment));

        String expectedPath = ("/api/" + longSegment).substring(0, 200);
        assertThat(output.getOut().lines().filter(line -> line.contains("без входа")))
                .singleElement()
                .asString()
                .contains("GET " + expectedPath)
                .doesNotContain(expectedPath + "a");
    }

    private String tokenOf(HttpResponse<String> csrfResponse) {
        return jsonMapper.readTree(csrfResponse.body()).get("token").asString();
    }

    private String sessionValueOf(HttpResponse<String> response) {
        return client.sessionCookie(response).substring("SESSION=".length());
    }
}
