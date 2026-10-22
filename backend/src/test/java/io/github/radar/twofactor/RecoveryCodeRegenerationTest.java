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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
class RecoveryCodeRegenerationTest {
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
    void issues_new_set_of_recovery_codes() throws Exception {
        HttpResponse<String> actualResponse = regenerate(PASSWORD, api.totp(api.code(user.secret())));

        List<String> actualCodes = codes(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualCodes).hasSize(10).doesNotHaveDuplicates().doesNotContainAnyElementsOf(user.recoveryCodes());
        assertThat(api.verifyLogin(api.startLogin(user.email()), api.recovery(actualCodes.getFirst())).statusCode())
                .isEqualTo(200);
    }

    @Test
    void cancels_previous_recovery_codes() throws Exception {
        regenerate(PASSWORD, api.totp(api.code(user.secret())));

        HttpResponse<String> actualResponse =
                api.verifyLogin(api.startLogin(user.email()), api.recovery(user.recoveryCodes().get(1)));

        assertProblem(actualResponse, 401, "/problems/invalid-second-factor");
    }

    @Test
    void accepts_recovery_code_as_second_factor() throws Exception {
        HttpResponse<String> actualResponse = regenerate(PASSWORD, api.recovery(user.recoveryCodes().getFirst()));

        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void rejects_wrong_password_and_keeps_previous_codes() throws Exception {
        HttpResponse<String> actualResponse =
                regenerate("Wrong long passphrase here", api.totp(api.code(user.secret())));

        assertProblem(actualResponse, 401, "/problems/invalid-reauthentication");
        assertThat(api.verifyLogin(api.startLogin(user.email()), api.recovery(user.recoveryCodes().get(1))).statusCode())
                .isEqualTo(200);
    }

    @Test
    void rejects_wrong_second_factor() throws Exception {
        HttpResponse<String> actualResponse =
                regenerate(PASSWORD, api.recovery("00000000-00000000-00000000-00000000"));

        assertProblem(actualResponse, 401, "/problems/invalid-reauthentication");
    }

    @Test
    void reports_two_factor_not_enabled() throws Exception {
        BrowserSession plain = client.registerAndLogin("maria-" + UUID.randomUUID() + "@example.com", PASSWORD);

        HttpResponse<String> actualResponse = client.postJson("/auth/2fa/recovery-codes",
                "{\"password\": \"" + PASSWORD + "\", \"secondFactor\": " + api.totp("123456") + "}", plain);

        assertProblem(actualResponse, 409, "/problems/two-factor-not-enabled");
    }

    @Test
    void resets_confirmation_of_identity() throws Exception {
        api.reauthenticate(session, user.secret());
        regenerate(PASSWORD, api.totp(api.code(user.secret())));

        HttpResponse<String> actualResponse = client.send(session.apply(client.request("/auth/password"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString("{\"newPassword\": \"Another long company passphrase\"}")));

        assertProblem(actualResponse, 403, "/problems/reauthentication-required");
    }

    private HttpResponse<String> regenerate(String password, String secondFactor) throws IOException, InterruptedException {
        return client.postJson("/auth/2fa/recovery-codes",
                "{\"password\": \"" + password + "\", \"secondFactor\": " + secondFactor + "}", session);
    }

    private List<String> codes(HttpResponse<String> response) {
        List<String> codes = new ArrayList<>();
        api.json(response).get("recoveryCodes").forEach(code -> codes.add(code.asString()));
        return codes;
    }

    private void assertProblem(HttpResponse<String> actualResponse, int status, String type) {
        assertThat(actualResponse.statusCode()).isEqualTo(status);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo(type);
    }
}
