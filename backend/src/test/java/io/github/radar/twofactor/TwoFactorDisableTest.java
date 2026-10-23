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
class TwoFactorDisableTest {
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
    void disables_two_factor_with_password_and_totp() throws Exception {
        HttpResponse<String> actualResponse = disable(session, PASSWORD, api.totp(api.code(user.secret())));

        BrowserSession current = client.continueSession(client.sessionCookie(actualResponse));
        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(actualResponse.body()).isEmpty();
        assertThat(twoFactorEnabled(current)).isFalse();
        assertThat(api.json(api.login(user.email())).get("status").asString())
                .as("Вход снова завершается паролем.")
                .isEqualTo("authenticated");
    }

    @Test
    void disables_two_factor_with_recovery_code() throws Exception {
        HttpResponse<String> actualResponse = disable(session, PASSWORD, api.recovery(user.recoveryCodes().getFirst()));

        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(twoFactorEnabled(client.continueSession(client.sessionCookie(actualResponse)))).isFalse();
    }

    @Test
    void ends_other_sessions_and_replaces_current_cookie() throws Exception {
        BrowserSession other = api.loginWithTotp(user);

        HttpResponse<String> actualResponse = disable(session, PASSWORD, api.totp(api.code(user.secret())));

        BrowserSession current = client.continueSession(client.sessionCookie(actualResponse));
        assertThat(api.me(other).statusCode()).as("Остальные сессии завершены.").isEqualTo(401);
        assertThat(api.me(session).statusCode()).as("Прежний ID текущей сессии не действует.").isEqualTo(401);
        assertThat(api.me(current).statusCode()).isEqualTo(200);
    }

    @Test
    void requires_new_csrf_token_after_disabling() throws Exception {
        HttpResponse<String> response = disable(session, PASSWORD, api.totp(api.code(user.secret())));

        HttpResponse<String> actualResponse = client.postJson("/auth/reauthenticate",
                "{\"password\": \"" + PASSWORD + "\"}", session.withCookie(client.sessionCookie(response)));

        assertProblem(actualResponse, 403, "/problems/invalid-csrf-token");
    }

    @Test
    void resets_confirmation_of_identity() throws Exception {
        api.reauthenticate(session, user.secret());
        BrowserSession current = client.continueSession(client.sessionCookie(
                disable(session, PASSWORD, api.totp(api.code(user.secret())))));

        HttpResponse<String> actualResponse = client.send(current.apply(client.request("/auth/password"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString("{\"newPassword\": \"Another long company passphrase\"}")));

        assertProblem(actualResponse, 403, "/problems/reauthentication-required");
    }

    @Test
    void rejects_wrong_password_and_keeps_two_factor() throws Exception {
        HttpResponse<String> actualResponse =
                disable(session, "Wrong long passphrase here", api.totp(api.code(user.secret())));

        assertProblem(actualResponse, 401, "/problems/invalid-reauthentication");
        assertThat(twoFactorEnabled(session)).isTrue();
    }

    @Test
    void rejects_wrong_second_factor_and_keeps_two_factor() throws Exception {
        HttpResponse<String> actualResponse =
                disable(session, PASSWORD, api.recovery("00000000-00000000-00000000-00000000"));

        assertProblem(actualResponse, 401, "/problems/invalid-reauthentication");
        assertThat(twoFactorEnabled(session)).isTrue();
    }

    @Test
    void requires_second_factor_in_request_despite_recent_confirmation() throws Exception {
        api.reauthenticate(session, user.secret());

        HttpResponse<String> actualResponse =
                client.postJson("/auth/2fa/disable", "{\"password\": \"" + PASSWORD + "\"}", session);

        JsonNode actualIssue = api.json(actualResponse).get("errors").get(0);
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualIssue.get("field").asString()).isEqualTo("secondFactor");
        assertThat(actualIssue.get("title").asString()).isEqualTo("REQUIRED");
        assertThat(twoFactorEnabled(session)).isTrue();
    }

    @Test
    void requires_new_setup_to_enable_again() throws Exception {
        BrowserSession plain = client.registerAndLogin("maria-" + UUID.randomUUID() + "@example.com", PASSWORD);
        String secret = api.setup(plain);
        BrowserSession current = client.continueSession(client.sessionCookie(api.enable(plain, api.code(secret))));
        api.nextStep();
        current = client.continueSession(client.sessionCookie(disable(current, PASSWORD, api.totp(api.code(secret)))));
        api.nextStep();
        client.postJson("/auth/reauthenticate", "{\"password\": \"" + PASSWORD + "\"}", current);

        HttpResponse<String> actualResponse = api.enable(current, api.code(secret));

        assertProblem(actualResponse, 409, "/problems/totp-setup-expired");
    }

    @Test
    void reports_two_factor_not_enabled() throws Exception {
        BrowserSession plain = client.registerAndLogin("maria-" + UUID.randomUUID() + "@example.com", PASSWORD);

        HttpResponse<String> actualResponse = disable(plain, PASSWORD, api.totp("123456"));

        assertProblem(actualResponse, 409, "/problems/two-factor-not-enabled");
    }

    @Test
    void cancels_recovery_codes_of_disabled_factor() throws Exception {
        BrowserSession current = client.continueSession(client.sessionCookie(
                disable(session, PASSWORD, api.totp(api.code(user.secret())))));
        String secret = api.setup(current);
        api.enable(current, api.code(secret));
        api.nextStep();

        HttpResponse<String> actualResponse =
                api.verifyLogin(api.startLogin(user.email()), api.recovery(user.recoveryCodes().getFirst()));

        assertProblem(actualResponse, 401, "/problems/invalid-second-factor");
    }

    @Test
    void rejects_second_step_started_before_disabling() throws Exception {
        BrowserSession pending = api.startLogin(user.email());
        disable(session, PASSWORD, api.totp(api.code(user.secret())));
        api.nextStep();

        HttpResponse<String> actualResponse = api.verifyLogin(pending, api.totp(api.code(user.secret())));

        assertProblem(actualResponse, 401, "/problems/invalid-second-factor");
    }

    private HttpResponse<String> disable(BrowserSession target, String password, String secondFactor)
            throws IOException, InterruptedException {
        return client.postJson("/auth/2fa/disable",
                "{\"password\": \"" + password + "\", \"secondFactor\": " + secondFactor + "}", target);
    }

    private boolean twoFactorEnabled(BrowserSession target) throws IOException, InterruptedException {
        return api.json(api.me(target)).get("user").get("twoFactorEnabled").asBoolean();
    }

    private void assertProblem(HttpResponse<String> actualResponse, int status, String type) {
        assertThat(actualResponse.statusCode()).isEqualTo(status);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo(type);
    }
}
