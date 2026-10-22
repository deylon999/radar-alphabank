package io.github.radar.logging;

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
import java.net.http.HttpResponse;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
@ExtendWith(OutputCaptureExtension.class)
class TwoFactorLoggingTest {
    @LocalServerPort
    private int port;

    @Autowired
    private MutableClock clock;

    private ApiHttpClient client;

    private TwoFactorApi api;

    @BeforeEach
    void createClient() {
        clock.reset();
        client = new ApiHttpClient(port);
        api = new TwoFactorApi(client, clock);
    }

    @Test
    void logs_enabling_without_secret_or_codes(CapturedOutput output) throws Exception {
        BrowserSession session = client.registerAndLogin("ivan-" + UUID.randomUUID() + "@example.com", PASSWORD);
        String secret = api.setup(session);
        String code = api.code(secret);

        HttpResponse<String> response = api.enable(session, code);

        assertThat(securityLines(output, "Начата настройка TOTP")).singleElement().asString().contains("INFO");
        assertThat(securityLines(output, "2FA включена")).singleElement().asString().contains("INFO");
        assertThat(output).doesNotContain(secret, "otpauth://", "\"code\"");
        api.json(response).get("recoveryCodes").forEach(recovery -> assertThat(output).doesNotContain(recovery.asString()));
    }

    @Test
    void logs_rejected_first_code_as_warning(CapturedOutput output) throws Exception {
        BrowserSession session = client.registerAndLogin("ivan-" + UUID.randomUUID() + "@example.com", PASSWORD);
        String secret = api.setup(session);

        api.enable(session, otherCode(api.code(secret)));

        assertThat(securityLines(output, "Первый код TOTP не принят")).singleElement().asString().contains("WARN");
    }

    @Test
    void logs_two_step_login_with_user_id_and_without_codes(CapturedOutput output) throws Exception {
        TwoFactorUser user = api.newUserWithTwoFactor();
        BrowserSession pending = api.startLogin(user.email());
        String wrongCode = otherCode(api.code(user.secret()));
        final String userId = api.json(api.me(user.session())).get("user").get("id").asString();

        api.verifyLogin(pending, api.totp(wrongCode));
        api.verifyLogin(pending, api.recovery(user.recoveryCodes().getFirst()));

        assertThat(securityLines(output, "вход ждёт второй фактор")).singleElement().asString()
                .contains("INFO", "i***@example.com")
                .doesNotContain(user.email());
        assertThat(securityLines(output, "Второй фактор при входе не принят")).singleElement().asString()
                .contains("WARN", userId);
        assertThat(securityLines(output, "Вход выполнен: пользователь " + userId)).hasSize(2);
        assertThat(output).doesNotContain(wrongCode, user.recoveryCodes().getFirst(), user.secret());
    }

    @Test
    void logs_disabling_and_regeneration(CapturedOutput output) throws Exception {
        TwoFactorUser user = api.newUserWithTwoFactor();
        client.postJson("/auth/2fa/recovery-codes", "{\"password\": \"" + PASSWORD + "\", \"secondFactor\": "
                + api.totp(api.code(user.secret())) + "}", user.session());
        api.nextStep();

        client.postJson("/auth/2fa/disable", "{\"password\": \"" + PASSWORD + "\", \"secondFactor\": "
                + api.totp(api.code(user.secret())) + "}", user.session());

        assertThat(securityLines(output, "Резервные коды перевыпущены")).singleElement().asString().contains("INFO");
        assertThat(securityLines(output, "2FA отключена")).singleElement().asString().contains("INFO");
        assertThat(output).doesNotContain(PASSWORD);
    }

    @Test
    void logs_failed_check_before_disabling_as_warning(CapturedOutput output) throws Exception {
        TwoFactorUser user = api.newUserWithTwoFactor();

        client.postJson("/auth/2fa/disable", "{\"password\": \"" + PASSWORD + "\", \"secondFactor\": "
                + api.recovery("00000000-00000000-00000000-00000000") + "}", user.session());

        assertThat(securityLines(output, "Подтверждение личности не пройдено")).singleElement().asString().contains("WARN");
    }

    private String otherCode(String code) {
        return String.format("%06d", (Integer.parseInt(code) + 1) % 1_000_000);
    }

    private Stream<String> securityLines(CapturedOutput output, String event) {
        return output.getOut().lines().filter(line -> line.contains("radar.security") && line.contains(event));
    }
}
