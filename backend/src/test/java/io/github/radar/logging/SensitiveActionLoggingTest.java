package io.github.radar.logging;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.CompanyApi;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpRequest;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
@ExtendWith(OutputCaptureExtension.class)
class SensitiveActionLoggingTest {
    private static final String PASSWORD = "My company has useful news";

    private static final String NEW_PASSWORD = "Another long company passphrase";

    @LocalServerPort
    private int port;

    private ApiHttpClient client;

    private CompanyApi api;

    private BrowserSession session;

    @BeforeEach
    void logIn() throws IOException, InterruptedException {
        client = new ApiHttpClient(port);
        api = new CompanyApi(client);
        session = api.newUser();
    }

    @Test
    void logs_successful_confirmation_of_identity(CapturedOutput output) throws Exception {
        api.reauthenticate(session);

        assertThat(securityLines(output, "Личность подтверждена")).singleElement().asString().contains("INFO");
    }

    @Test
    void logs_failed_confirmation_as_warning_without_password(CapturedOutput output) throws Exception {
        client.postJson("/auth/reauthenticate", "{\"password\": \"Wrong long passphrase here\"}", session);

        assertThat(securityLines(output, "Подтверждение личности не пройдено")).singleElement().asString().contains("WARN");
        assertThat(output).doesNotContain("Wrong long passphrase here");
    }

    @Test
    void logs_password_change_without_any_password(CapturedOutput output) throws Exception {
        api.reauthenticate(session);

        client.send(session.apply(client.request("/auth/password"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString("{\"newPassword\": \"" + NEW_PASSWORD + "\"}")));

        assertThat(securityLines(output, "Пароль изменён")).singleElement().asString().contains("INFO");
        assertThat(output).doesNotContain(PASSWORD, NEW_PASSWORD);
    }

    @Test
    void logs_ownership_transfer(CapturedOutput output) throws Exception {
        String companyId = api.createCompany(session);
        BrowserSession member = api.newUser();
        api.join(session, companyId, member, null);
        String memberId = api.userId(member);
        api.reauthenticate(session);

        api.transfer(session, companyId, memberId);

        assertThat(securityLines(output, "Права владельца")).singleElement().asString().contains("INFO", companyId, memberId);
    }

    @Test
    void logs_sensitive_action_without_confirmation_as_warning(CapturedOutput output) throws Exception {
        client.send(session.apply(client.request("/auth/password"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString("{\"newPassword\": \"" + NEW_PASSWORD + "\"}")));

        assertThat(securityLines(output, "без подтверждения личности")).singleElement().asString()
                .contains("WARN", "PATCH /auth/password");
    }

    private Stream<String> securityLines(CapturedOutput output, String event) {
        return output.getOut().lines().filter(line -> line.contains("radar.security") && line.contains(event));
    }
}
