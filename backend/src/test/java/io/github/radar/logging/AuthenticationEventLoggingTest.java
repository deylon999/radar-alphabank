package io.github.radar.logging;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.InetAddress;
import java.net.http.HttpResponse;
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
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
@ExtendWith(OutputCaptureExtension.class)
class AuthenticationEventLoggingTest {
    private static final String LOOPBACK = InetAddress.getLoopbackAddress().getHostAddress();

    private static final String PASSWORD = "My company has useful news";

    private static final String WRONG_PASSWORD = "Wrong long passphrase here";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    private ApiHttpClient client;

    private String localPart;

    private String email;

    @BeforeEach
    void prepare() {
        client = new ApiHttpClient(port);
        localPart = "ivan-" + UUID.randomUUID();
        email = localPart + "@example.com";
    }

    @Test
    void logs_registration_with_user_id_but_without_credentials(CapturedOutput output) throws Exception {
        String userId = register();

        assertThat(securityLines(output, "Зарегистрирован пользователь"))
                .singleElement().asString().contains("INFO", userId);
        assertThat(output).doesNotContain(PASSWORD, localPart);
    }

    @Test
    void logs_registration_of_taken_email_with_masked_email(CapturedOutput output) throws Exception {
        register();

        register();

        assertThat(securityLines(output, "email уже занят"))
                .singleElement().asString().contains("i***@example.com", LOOPBACK);
        assertThat(output).doesNotContain(localPart);
    }

    @Test
    void logs_failed_login_as_warning_with_masked_email_and_ip(CapturedOutput output) throws Exception {
        register();

        login(client.openSession(), WRONG_PASSWORD);

        assertThat(securityLines(output, "Неудачный вход"))
                .singleElement().asString().contains("WARN", "i***@example.com", LOOPBACK);
        assertThat(output).doesNotContain(WRONG_PASSWORD, PASSWORD, localPart);
    }

    @Test
    void logs_successful_login_with_user_id(CapturedOutput output) throws Exception {
        String userId = register();

        login(client.openSession(), PASSWORD);

        assertThat(securityLines(output, "Вход выполнен"))
                .singleElement().asString().contains("INFO", userId);
        assertThat(output).doesNotContain(PASSWORD, localPart);
    }

    @Test
    void marks_requests_of_logged_in_user_with_user_id(CapturedOutput output) throws Exception {
        String userId = register();
        HttpResponse<String> loginResponse = login(client.openSession(), PASSWORD);
        BrowserSession loggedIn = client.continueSession(client.sessionCookie(loginResponse));

        login(loggedIn, PASSWORD);

        assertThat(output.getOut().lines().filter(line -> line.contains("POST /auth/login -> исключение")))
                .singleElement().asString().contains(userId);
    }

    private Stream<String> securityLines(CapturedOutput output, String event) {
        return output.getOut().lines().filter(line -> line.contains("radar.security") && line.contains(event));
    }

    private String register() throws IOException, InterruptedException {
        HttpResponse<String> response = client.postJson("/auth/register", credentials(PASSWORD), client.openSession());
        return response.statusCode() == 201 ? jsonMapper.readTree(response.body()).get("id").asString() : "";
    }

    private HttpResponse<String> login(BrowserSession session, String password) throws IOException, InterruptedException {
        return client.postJson("/auth/login", credentials(password), session);
    }

    private String credentials(String password) {
        return jsonMapper.writeValueAsString(Map.of("email", email, "password", password));
    }
}
