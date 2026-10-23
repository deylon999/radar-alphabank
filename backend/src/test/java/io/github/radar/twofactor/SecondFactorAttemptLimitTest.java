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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "radar.rate-limit.second-factor.user-attempts=3",
            "radar.rate-limit.second-factor.window=24h"
        }
)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
class SecondFactorAttemptLimitTest {
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
    void blocks_totp_after_failed_attempts_even_for_correct_code() throws Exception {
        BrowserSession pending = api.startLogin(user.email());
        failTimes(pending, 3);

        HttpResponse<String> actualResponse = api.verifyLogin(pending, api.totp(api.code(user.secret())));

        assertThat(actualResponse.statusCode()).isEqualTo(429);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/too-many-attempts");
        assertThat(Long.parseLong(actualResponse.headers().firstValue("Retry-After").orElseThrow()))
                .isBetween(24 * 3600L - 60, 24 * 3600L);
    }

    @Test
    void keeps_limit_after_new_password_check() throws Exception {
        failTimes(api.startLogin(user.email()), 3);

        HttpResponse<String> actualResponse =
                api.verifyLogin(api.startLogin(user.email()), api.totp(api.code(user.secret())));

        assertThat(actualResponse.statusCode()).as("Новое ожидание не сбрасывает лимит.").isEqualTo(429);
    }

    @Test
    void accepts_recovery_code_while_totp_is_blocked() throws Exception {
        BrowserSession pending = api.startLogin(user.email());
        failTimes(pending, 4);

        HttpResponse<String> actualResponse = api.verifyLogin(pending, api.recovery(user.recoveryCodes().getFirst()));

        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void forgets_failed_attempts_after_accepted_code() throws Exception {
        BrowserSession pending = api.startLogin(user.email());
        failTimes(pending, 2);
        api.verifyLogin(pending, api.totp(api.code(user.secret())));
        api.nextStep();
        BrowserSession next = api.startLogin(user.email());
        failTimes(next, 2);

        HttpResponse<String> actualResponse = api.verifyLogin(next, api.totp(api.code(user.secret())));

        assertThat(actualResponse.statusCode()).isEqualTo(200);
    }

    @Test
    void counts_wrong_totp_in_confirmation_of_identity() throws Exception {
        BrowserSession session = user.session();
        for (int attempt = 0; attempt < 3; attempt++) {
            client.postJson("/auth/reauthenticate", "{\"password\": \"" + TwoFactorApi.PASSWORD
                    + "\", \"secondFactor\": " + api.totp(otherCode(api.code(user.secret()))) + "}", session);
        }

        HttpResponse<String> actualResponse = api.reauthenticate(session, user.secret());

        assertThat(actualResponse.statusCode()).isEqualTo(429);
    }

    @Test
    void limits_wrong_first_codes_when_enabling() throws Exception {
        BrowserSession session = client.registerAndLogin("maria-" + UUID.randomUUID() + "@example.com", TwoFactorApi.PASSWORD);
        String secret = api.setup(session);
        for (int attempt = 0; attempt < 3; attempt++) {
            api.enable(session, otherCode(api.code(secret)));
        }

        HttpResponse<String> actualResponse = api.enable(session, api.code(secret));

        assertThat(actualResponse.statusCode()).isEqualTo(429);
    }

    private void failTimes(BrowserSession pending, int times) throws IOException, InterruptedException {
        for (int attempt = 0; attempt < times; attempt++) {
            api.verifyLogin(pending, api.totp(otherCode(api.code(user.secret()))));
        }
    }

    private String otherCode(String code) {
        return String.format("%06d", (Integer.parseInt(code) + 1) % 1_000_000);
    }
}
