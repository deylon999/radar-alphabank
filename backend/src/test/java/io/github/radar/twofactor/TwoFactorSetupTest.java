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
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
class TwoFactorSetupTest {
    private static final String RECOVERY_CODE_PATTERN = "^[0-9a-f]{8}(-[0-9a-f]{8}){3}$";

    @LocalServerPort
    private int port;

    @Autowired
    private MutableClock clock;

    private ApiHttpClient client;

    private TwoFactorApi api;

    private String email;

    private BrowserSession session;

    @BeforeEach
    void logIn() throws IOException, InterruptedException {
        clock.reset();
        client = new ApiHttpClient(port);
        api = new TwoFactorApi(client, clock);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
        session = client.registerAndLogin(email, PASSWORD);
    }

    @Test
    void starts_setup_with_secret_and_uri_for_five_minutes() throws Exception {
        reauthenticate(session);

        HttpResponse<String> actualResponse = setup(session);

        JsonNode actualBody = api.json(actualResponse);
        String actualSecret = actualBody.get("secret").asString();
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualSecret).as("160 бит в Base32 без дополнения.").matches("^[A-Z2-7]{32}$");
        assertThat(actualBody.get("provisioningUri").asString())
                .startsWith("otpauth://totp/Radar:" + email.replace("@", "%40") + "?")
                .contains("secret=" + actualSecret, "issuer=Radar", "digits=6", "period=30");
        assertThat(Instant.parse(actualBody.get("expiresAt").asString())).isEqualTo(clock.instant().plus(Duration.ofMinutes(5)));
    }

    @Test
    void requires_confirmation_of_identity_for_setup() throws Exception {
        HttpResponse<String> actualResponse = setup(session);

        assertProblem(actualResponse, 403, "/problems/reauthentication-required");
    }

    @Test
    void enables_two_factor_with_first_code_and_issues_recovery_codes() throws Exception {
        String secret = api.setup(session);

        HttpResponse<String> actualResponse = api.enable(session, api.code(secret));

        List<String> actualCodes = new ArrayList<>();
        api.json(actualResponse).get("recoveryCodes").forEach(code -> actualCodes.add(code.asString()));
        BrowserSession current = client.continueSession(client.sessionCookie(actualResponse));
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualCodes).hasSize(10).doesNotHaveDuplicates().allMatch(code -> code.matches(RECOVERY_CODE_PATTERN));
        assertThat(twoFactorEnabled(current)).isTrue();
    }

    @Test
    void rejects_wrong_first_code_and_keeps_two_factor_disabled() throws Exception {
        String secret = api.setup(session);

        HttpResponse<String> actualResponse = api.enable(session, otherCode(api.code(secret)));

        assertProblem(actualResponse, 401, "/problems/invalid-second-factor");
        assertThat(twoFactorEnabled(session)).isFalse();
    }

    @Test
    void enables_just_before_setup_expires() throws Exception {
        String secret = api.setup(session);
        clock.advance(Duration.ofMinutes(5).minusSeconds(1));

        HttpResponse<String> actualResponse = api.enable(session, api.code(secret));

        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void rejects_code_after_setup_expired() throws Exception {
        String secret = api.setup(session);
        clock.advance(Duration.ofMinutes(5));
        reauthenticate(session);

        HttpResponse<String> actualResponse = api.enable(session, api.code(secret));

        assertProblem(actualResponse, 409, "/problems/totp-setup-expired");
        assertThat(twoFactorEnabled(session)).isFalse();
    }

    @Test
    void rejects_code_without_setup() throws Exception {
        reauthenticate(session);

        assertProblem(api.enable(session, "123456"), 409, "/problems/totp-setup-expired");
    }

    @Test
    void ignores_setup_started_in_other_session() throws Exception {
        String secret = api.setup(session);
        BrowserSession other = client.login(email, PASSWORD, Map.of());
        reauthenticate(other);

        HttpResponse<String> actualResponse = api.enable(other, api.code(secret));

        assertProblem(actualResponse, 409, "/problems/totp-setup-expired");
    }

    @Test
    void replaces_previous_setup_when_started_again() throws Exception {
        String previousSecret = api.setup(session);
        String secret = api.setup(session);

        HttpResponse<String> rejected = api.enable(session, api.code(previousSecret));
        HttpResponse<String> actualResponse = api.enable(session, api.code(secret));

        assertProblem(rejected, 401, "/problems/invalid-second-factor");
        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void requires_confirmation_of_identity_for_enabling() throws Exception {
        String secret = api.setup(session);
        clock.advance(Duration.ofMinutes(5));

        HttpResponse<String> actualResponse = api.enable(session, api.code(secret));

        assertProblem(actualResponse, 403, "/problems/reauthentication-required");
    }

    @Test
    void rejects_malformed_code_as_validation_problem() throws Exception {
        api.setup(session);

        HttpResponse<String> actualResponse = api.enable(session, "12345a");

        JsonNode actualIssue = api.json(actualResponse).get("errors").get(0);
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualIssue.get("field").asString()).isEqualTo("code");
        assertThat(actualIssue.get("title").asString()).isEqualTo("MUST_MATCH_PATTERN");
    }

    @Test
    void ends_other_sessions_and_replaces_current_cookie_on_enabling() throws Exception {
        BrowserSession other = client.login(email, PASSWORD, Map.of());
        String secret = api.setup(session);

        HttpResponse<String> actualResponse = api.enable(session, api.code(secret));

        BrowserSession current = client.continueSession(client.sessionCookie(actualResponse));
        assertThat(sessionsStatus(other)).as("Остальные сессии завершены.").isEqualTo(401);
        assertThat(sessionsStatus(session)).as("Прежний ID текущей сессии не действует.").isEqualTo(401);
        assertThat(sessionsStatus(current)).isEqualTo(200);
    }

    @Test
    void requires_new_csrf_token_after_enabling() throws Exception {
        String secret = api.setup(session);
        HttpResponse<String> response = api.enable(session, api.code(secret));

        HttpResponse<String> actualResponse = reauthenticate(session.withCookie(client.sessionCookie(response)));

        assertProblem(actualResponse, 403, "/problems/invalid-csrf-token");
    }

    @Test
    void resets_confirmation_of_identity_on_enabling() throws Exception {
        String secret = api.setup(session);
        BrowserSession current = client.continueSession(client.sessionCookie(api.enable(session, api.code(secret))));

        HttpResponse<String> actualResponse = client.send(current.apply(client.request("/auth/password"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString("{\"newPassword\": \"Another long company passphrase\"}")));

        assertProblem(actualResponse, 403, "/problems/reauthentication-required");
    }

    @Test
    void rejects_setup_when_two_factor_already_enabled() throws Exception {
        TwoFactorUser user = api.newUserWithTwoFactor();
        api.reauthenticate(user.session(), user.secret());

        HttpResponse<String> actualResponse = setup(user.session());

        assertProblem(actualResponse, 409, "/problems/two-factor-already-enabled");
    }

    @Test
    void rejects_enabling_when_two_factor_already_enabled() throws Exception {
        TwoFactorUser user = api.newUserWithTwoFactor();
        api.reauthenticate(user.session(), user.secret());

        HttpResponse<String> actualResponse = api.enable(user.session(), api.code(user.secret()));

        assertProblem(actualResponse, 409, "/problems/two-factor-already-enabled");
    }

    @Test
    void keeps_single_factor_after_concurrent_enabling() throws Exception {
        BrowserSession other = client.login(email, PASSWORD, Map.of());
        String secret = api.setup(session);
        String otherSecret = api.setup(other);

        List<HttpResponse<String>> actualResponses = List.of(
                        CompletableFuture.supplyAsync(() -> enableQuietly(session, secret)),
                        CompletableFuture.supplyAsync(() -> enableQuietly(other, otherSecret)))
                .stream()
                .map(CompletableFuture::join)
                .toList();

        String winnerSecret = actualResponses.getFirst().statusCode() == 200 ? secret : otherSecret;
        String loserSecret = winnerSecret.equals(secret) ? otherSecret : secret;
        api.nextStep();
        HttpResponse<String> loserLogin = api.verifyLogin(api.startLogin(email), api.totp(api.code(loserSecret)));
        HttpResponse<String> winnerLogin = api.verifyLogin(api.startLogin(email), api.totp(api.code(winnerSecret)));
        assertThat(actualResponses).filteredOn(response -> response.statusCode() == 200).hasSize(1);
        assertThat(loserLogin.statusCode()).isEqualTo(401);
        assertThat(winnerLogin.statusCode()).isEqualTo(200);
    }

    private HttpResponse<String> enableQuietly(BrowserSession target, String secret) {
        try {
            return api.enable(target, api.code(secret));
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private HttpResponse<String> setup(BrowserSession target) throws IOException, InterruptedException {
        return client.postJson("/auth/2fa/setup", "", target);
    }

    private HttpResponse<String> reauthenticate(BrowserSession target) throws IOException, InterruptedException {
        return client.postJson("/auth/reauthenticate", "{\"password\": \"" + PASSWORD + "\"}", target);
    }

    private boolean twoFactorEnabled(BrowserSession target) throws IOException, InterruptedException {
        return api.json(api.me(target)).get("user").get("twoFactorEnabled").asBoolean();
    }

    private int sessionsStatus(BrowserSession target) throws IOException, InterruptedException {
        return client.send(target.apply(client.request("/auth/sessions"))).statusCode();
    }

    private String otherCode(String code) {
        return String.format("%06d", (Integer.parseInt(code) + 1) % 1_000_000);
    }

    private void assertProblem(HttpResponse<String> actualResponse, int status, String type) {
        assertThat(actualResponse.statusCode()).isEqualTo(status);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo(type);
    }
}
