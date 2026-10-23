package io.github.radar.twofactor;

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
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
class TwoFactorLoginTest {
    @LocalServerPort
    private int port;

    @Autowired
    private MutableClock clock;

    private ApiHttpClient client;

    private TwoFactorApi api;

    private TwoFactorUser user;

    @BeforeEach
    void enableTwoFactor() throws IOException, InterruptedException {
        clock.reset();
        client = new ApiHttpClient(port);
        api = new TwoFactorApi(client, clock);
        user = api.newUserWithTwoFactor();
    }

    @Test
    void asks_for_second_factor_without_granting_access() throws Exception {
        HttpResponse<String> actualResponse = api.login(user.email());

        JsonNode actualBody = api.json(actualResponse);
        BrowserSession pending = client.continueSession(client.sessionCookie(actualResponse));
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualBody.get("status").asString()).isEqualTo("mfa_required");
        assertThat(Instant.parse(actualBody.get("expiresAt").asString())).isEqualTo(clock.instant().plus(Duration.ofMinutes(5)));
        assertThat(actualBody.has("user")).as("До второго фактора пользователь не раскрывается.").isFalse();
        assertThat(api.me(pending).statusCode()).as("Ожидание второго фактора не даёт доступа.").isEqualTo(401);
    }

    @Test
    void completes_login_with_totp_in_new_session() throws Exception {
        BrowserSession pending = api.startLogin(user.email());

        HttpResponse<String> actualResponse = api.verifyLogin(pending, api.totp(api.code(user.secret())));

        JsonNode actualBody = api.json(actualResponse);
        BrowserSession current = client.continueSession(client.sessionCookie(actualResponse));
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualBody.get("status").asString()).isEqualTo("authenticated");
        assertThat(actualBody.get("user").get("email").asString()).isEqualTo(user.email());
        assertThat(actualBody.get("user").get("twoFactorEnabled").asBoolean()).isTrue();
        assertThat(api.me(current).statusCode()).isEqualTo(200);
        assertThat(api.me(pending).statusCode()).as("ID сессии меняется после второго шага.").isEqualTo(401);
    }

    @Test
    void completes_login_with_recovery_code_only_once() throws Exception {
        String recoveryCode = user.recoveryCodes().getFirst();
        HttpResponse<String> first = api.verifyLogin(api.startLogin(user.email()), api.recovery(recoveryCode));

        HttpResponse<String> actualResponse = api.verifyLogin(api.startLogin(user.email()), api.recovery(recoveryCode));

        assertThat(first.statusCode()).isEqualTo(200);
        assertProblem(actualResponse, 401, "/problems/invalid-second-factor");
    }

    @Test
    void accepts_other_recovery_codes_after_one_is_used() throws Exception {
        api.verifyLogin(api.startLogin(user.email()), api.recovery(user.recoveryCodes().getFirst()));

        HttpResponse<String> actualResponse =
                api.verifyLogin(api.startLogin(user.email()), api.recovery(user.recoveryCodes().get(1)));

        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void rejects_totp_code_already_used_in_same_step() throws Exception {
        String code = api.code(user.secret());
        api.verifyLogin(api.startLogin(user.email()), api.totp(code));

        HttpResponse<String> actualResponse = api.verifyLogin(api.startLogin(user.email()), api.totp(code));

        assertProblem(actualResponse, 401, "/problems/invalid-second-factor");
    }

    @Test
    void rejects_code_of_step_used_when_enabling() throws Exception {
        clock.advance(Duration.ofSeconds(-30));

        HttpResponse<String> actualResponse =
                api.verifyLogin(api.startLogin(user.email()), api.totp(api.code(user.secret())));

        assertProblem(actualResponse, 401, "/problems/invalid-second-factor");
    }

    @Test
    void keeps_waiting_after_wrong_code() throws Exception {
        BrowserSession pending = api.startLogin(user.email());
        HttpResponse<String> rejected = api.verifyLogin(pending, api.totp(otherCode(api.code(user.secret()))));

        HttpResponse<String> actualResponse = api.verifyLogin(pending, api.totp(api.code(user.secret())));

        assertProblem(rejected, 401, "/problems/invalid-second-factor");
        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void rejects_unknown_recovery_code() throws Exception {
        HttpResponse<String> actualResponse =
                api.verifyLogin(api.startLogin(user.email()), api.recovery("00000000-00000000-00000000-00000000"));

        assertProblem(actualResponse, 401, "/problems/invalid-second-factor");
    }

    @Test
    void ends_waiting_once_login_completes() throws Exception {
        HttpResponse<String> response = api.verifyLogin(api.startLogin(user.email()), api.totp(api.code(user.secret())));
        BrowserSession current = client.continueSession(client.sessionCookie(response));
        api.nextStep();

        HttpResponse<String> actualResponse = api.verifyLogin(current, api.totp(api.code(user.secret())));

        assertProblem(actualResponse, 401, "/problems/pending-login-required");
    }

    @Test
    void requires_pending_login_for_second_step() throws Exception {
        HttpResponse<String> actualResponse = api.verifyLogin(client.openSession(), api.totp(api.code(user.secret())));

        assertProblem(actualResponse, 401, "/problems/pending-login-required");
    }

    @Test
    void accepts_second_factor_just_before_waiting_ends() throws Exception {
        BrowserSession pending = api.startLogin(user.email());
        clock.advance(Duration.ofMinutes(5).minusSeconds(1));

        HttpResponse<String> actualResponse = api.verifyLogin(pending, api.totp(api.code(user.secret())));

        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void ends_waiting_after_five_minutes() throws Exception {
        BrowserSession pending = api.startLogin(user.email());
        clock.advance(Duration.ofMinutes(5));

        HttpResponse<String> actualResponse = api.verifyLogin(pending, api.totp(api.code(user.secret())));

        assertProblem(actualResponse, 401, "/problems/pending-login-required");
    }

    @Test
    void counts_absolute_limit_from_second_step() throws Exception {
        BrowserSession pending = api.startLogin(user.email());
        clock.advance(Duration.ofMinutes(4));
        BrowserSession current = client.continueSession(client.sessionCookie(
                api.verifyLogin(pending, api.totp(api.code(user.secret())))));

        clock.advance(Duration.ofHours(8).minusSeconds(1));
        int beforeLimit = api.me(current).statusCode();
        clock.advance(Duration.ofSeconds(1));
        int actualStatus = api.me(current).statusCode();

        assertThat(beforeLimit).as("8 часов считаются со второго шага, а не с проверки пароля.").isEqualTo(200);
        assertThat(actualStatus).isEqualTo(401);
    }

    @Test
    void requires_new_csrf_token_after_second_step() throws Exception {
        BrowserSession pending = api.startLogin(user.email());
        HttpResponse<String> response = api.verifyLogin(pending, api.totp(api.code(user.secret())));

        HttpResponse<String> actualResponse =
                client.postJson("/auth/logout", "", pending.withCookie(client.sessionCookie(response)));

        assertProblem(actualResponse, 403, "/problems/invalid-csrf-token");
    }

    @Test
    void requires_new_csrf_token_before_second_step() throws Exception {
        BrowserSession beforeLogin = client.openSession();
        HttpResponse<String> response = client.postJson("/auth/login",
                "{\"email\": \"" + user.email() + "\", \"password\": \"" + TwoFactorApi.PASSWORD + "\"}", beforeLogin);

        HttpResponse<String> actualResponse = api.verifyLogin(beforeLogin.withCookie(client.sessionCookie(response)),
                api.totp(api.code(user.secret())));

        assertProblem(actualResponse, 403, "/problems/invalid-csrf-token");
    }

    @Test
    void rejects_unknown_method_as_validation_problem() throws Exception {
        HttpResponse<String> actualResponse =
                api.verifyLogin(api.startLogin(user.email()), "{\"method\": \"sms\", \"code\": \"123456\"}");

        assertFieldIssue(actualResponse, "method", "INVALID_ENUM_VALUE");
    }

    @Test
    void requires_method() throws Exception {
        HttpResponse<String> actualResponse = api.verifyLogin(api.startLogin(user.email()), "{\"code\": \"123456\"}");

        assertFieldIssue(actualResponse, "method", "REQUIRED");
    }

    @Test
    void rejects_malformed_totp_code() throws Exception {
        HttpResponse<String> actualResponse = api.verifyLogin(api.startLogin(user.email()), api.totp("1234567"));

        assertFieldIssue(actualResponse, "code", "MUST_MATCH_PATTERN");
    }

    @Test
    void rejects_malformed_recovery_code() throws Exception {
        HttpResponse<String> actualResponse =
                api.verifyLogin(api.startLogin(user.email()), api.recovery("7E719DE3-09189305-52A5628D-8D872E45"));

        assertFieldIssue(actualResponse, "code", "MUST_MATCH_PATTERN");
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
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo(type);
    }
}
