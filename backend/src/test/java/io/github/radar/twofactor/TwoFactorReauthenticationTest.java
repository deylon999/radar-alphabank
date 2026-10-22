package io.github.radar.twofactor;

import static io.github.radar.TwoFactorApi.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.MutableClock;
import io.github.radar.MutableClockConfiguration;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import io.github.radar.TwoFactorApi;
import io.github.radar.TwoFactorApi.TwoFactorUser;
import java.io.IOException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
class TwoFactorReauthenticationTest {
    @LocalServerPort
    private int port;

    @Autowired
    private MutableClock clock;

    private ApiHttpClient client;

    private TwoFactorApi api;

    private TwoFactorUser user;

    private BrowserSession session;

    @BeforeEach
    void enableTwoFactor() throws IOException, InterruptedException {
        clock.reset();
        client = new ApiHttpClient(port);
        api = new TwoFactorApi(client, clock);
        user = api.newUserWithTwoFactor();
        session = user.session();
    }

    @Test
    void requires_second_factor_when_two_factor_enabled() throws Exception {
        HttpResponse<String> actualResponse = reauthenticate("{\"password\": \"" + PASSWORD + "\"}");

        assertProblem(actualResponse, 401, "/problems/invalid-reauthentication");
        assertThat(changePasswordStatus()).as("Подтверждение без второго фактора не выдано.").isEqualTo(403);
    }

    @Test
    void confirms_identity_with_password_and_totp() throws Exception {
        HttpResponse<String> actualResponse = api.reauthenticate(session, user.secret());

        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(changePasswordStatus()).isEqualTo(204);
    }

    @Test
    void rejects_wrong_totp() throws Exception {
        String wrongCode = otherCode(api.code(user.secret()));

        HttpResponse<String> actualResponse = reauthenticate(withSecondFactor(PASSWORD, api.totp(wrongCode)));

        assertProblem(actualResponse, 401, "/problems/invalid-reauthentication");
        assertThat(changePasswordStatus()).isEqualTo(403);
    }

    @Test
    void rejects_wrong_password_with_correct_totp() throws Exception {
        HttpResponse<String> actualResponse =
                reauthenticate(withSecondFactor("Wrong long passphrase here", api.totp(api.code(user.secret()))));

        assertProblem(actualResponse, 401, "/problems/invalid-reauthentication");
    }

    @Test
    void confirms_identity_with_recovery_code_only_once() throws Exception {
        String recoveryCode = user.recoveryCodes().getFirst();
        HttpResponse<String> first = reauthenticate(withSecondFactor(PASSWORD, api.recovery(recoveryCode)));

        HttpResponse<String> actualResponse = reauthenticate(withSecondFactor(PASSWORD, api.recovery(recoveryCode)));

        assertThat(first.statusCode()).isEqualTo(200);
        assertProblem(actualResponse, 401, "/problems/invalid-reauthentication");
    }

    @Test
    void rejects_totp_code_already_used_for_login() throws Exception {
        String code = api.code(user.secret());
        BrowserSession current = client.continueSession(client.sessionCookie(
                api.verifyLogin(api.startLogin(user.email()), api.totp(code))));

        HttpResponse<String> actualResponse =
                client.postJson("/auth/reauthenticate", withSecondFactor(PASSWORD, api.totp(code)), current);

        assertProblem(actualResponse, 401, "/problems/invalid-reauthentication");
    }

    @Test
    void ignores_second_factor_of_user_without_two_factor() throws Exception {
        BrowserSession plain = client.registerAndLogin("maria-" + UUID.randomUUID() + "@example.com", PASSWORD);

        HttpResponse<String> actualResponse = client.postJson("/auth/reauthenticate",
                withSecondFactor(PASSWORD, api.totp("123456")), plain);

        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void rejects_null_second_factor() throws Exception {
        HttpResponse<String> actualResponse = reauthenticate(withSecondFactor(PASSWORD, "null"));

        assertFieldIssue(actualResponse, "secondFactor", "MUST_NOT_BE_NULL");
    }

    @Test
    void reports_malformed_nested_code_with_full_path() throws Exception {
        HttpResponse<String> actualResponse = reauthenticate(withSecondFactor(PASSWORD, api.totp("12345")));

        assertFieldIssue(actualResponse, "secondFactor.code", "MUST_MATCH_PATTERN");
    }

    @Test
    void reports_unknown_nested_method_with_full_path() throws Exception {
        HttpResponse<String> actualResponse =
                reauthenticate(withSecondFactor(PASSWORD, "{\"method\": \"sms\", \"code\": \"123456\"}"));

        assertFieldIssue(actualResponse, "secondFactor.method", "INVALID_ENUM_VALUE");
    }

    private String withSecondFactor(String password, String secondFactor) {
        return "{\"password\": \"" + password + "\", \"secondFactor\": " + secondFactor + "}";
    }

    private HttpResponse<String> reauthenticate(String body) throws IOException, InterruptedException {
        return client.postJson("/auth/reauthenticate", body, session);
    }

    private int changePasswordStatus() throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/auth/password"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString("{\"newPassword\": \"Another long company passphrase\"}")))
                .statusCode();
    }

    private String otherCode(String code) {
        return String.format("%06d", (Integer.parseInt(code) + 1) % 1_000_000);
    }

    private void assertFieldIssue(HttpResponse<String> actualResponse, String field, String code) {
        JsonNode actualIssue = api.json(actualResponse).get("errors").get(0);
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualIssue.get("field").asString()).isEqualTo(field);
        assertThat(actualIssue.get("title").asString()).isEqualTo(code);
    }

    private void assertProblem(HttpResponse<String> actualResponse, int status, String type) {
        assertThat(actualResponse.statusCode()).isEqualTo(status);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo(type);
    }
}
