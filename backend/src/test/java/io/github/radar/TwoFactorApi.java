package io.github.radar;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.http.HttpResponse;
import java.security.InvalidKeyException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.codec.binary.Base32;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Вызовы API двухфакторной аутентификации для тестов. Коды TOTP считаются, как в приложении
 * пользователя, по секрету из ответа настройки и управляемым часам сервера.
 */
public final class TwoFactorApi {
    /**
     * Пароль пользователей, которых создаёт помощник.
     */
    public static final String PASSWORD = "My company has useful news";

    private final ApiHttpClient client;

    private final MutableClock clock;

    private final JsonMapper jsonMapper = new JsonMapper();

    private final TimeBasedOneTimePasswordGenerator generator = new TimeBasedOneTimePasswordGenerator();

    /**
     * Создаёт помощника.
     *
     * @param client HTTP-клиент
     * @param clock часы сервера
     */
    public TwoFactorApi(ApiHttpClient client, MutableClock clock) {
        this.client = client;
        this.clock = clock;
    }

    /**
     * Подтверждает личность паролем и начинает настройку TOTP.
     *
     * @param session вошедшая сессия
     * @return секрет в Base32
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public String setup(BrowserSession session) throws IOException, InterruptedException {
        client.postJson("/auth/reauthenticate", "{\"password\": \"" + PASSWORD + "\"}", session);
        HttpResponse<String> response = client.postJson("/auth/2fa/setup", "", session);
        return json(response).get("secret").asString();
    }

    /**
     * Подтверждает настройку кодом.
     *
     * @param session сессия, в которой начата настройка
     * @param code шестизначный код
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> enable(BrowserSession session, String code) throws IOException, InterruptedException {
        return client.postJson("/auth/2fa/enable", "{\"code\": \"" + code + "\"}", session);
    }

    /**
     * Регистрирует пользователя, входит и включает ему 2FA. Часы передвигаются на следующий
     * временной шаг, чтобы следующий код не совпал с уже принятым.
     *
     * @return пользователь с включённой 2FA
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public TwoFactorUser newUserWithTwoFactor() throws IOException, InterruptedException {
        String email = "ivan-" + UUID.randomUUID() + "@example.com";
        BrowserSession session = client.registerAndLogin(email, PASSWORD);
        String secret = setup(session);
        HttpResponse<String> response = enable(session, code(secret));
        if (response.statusCode() != HttpURLConnection.HTTP_OK) {
            throw new IllegalStateException("2FA не включена: " + response.statusCode());
        }
        List<String> recoveryCodes = new ArrayList<>();
        json(response).get("recoveryCodes").forEach(code -> recoveryCodes.add(code.asString()));
        nextStep();
        return new TwoFactorUser(email, secret, recoveryCodes,
                client.continueSession(client.sessionCookie(response)));
    }

    /**
     * Проверяет пароль первым шагом входа.
     *
     * @param email email пользователя
     * @return ответ первого шага
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> login(String email) throws IOException, InterruptedException {
        return client.postJson("/auth/login",
                jsonMapper.writeValueAsString(Map.of("email", email, "password", PASSWORD)), client.openSession());
    }

    /**
     * Проверяет пароль и возвращает сессию, ожидающую второй фактор, с её новым CSRF-токеном.
     *
     * @param email email пользователя
     * @return сессия с незавершённым входом
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public BrowserSession startLogin(String email) throws IOException, InterruptedException {
        return client.continueSession(client.sessionCookie(login(email)));
    }

    /**
     * Отправляет второй шаг входа.
     *
     * @param pending сессия с незавершённым входом
     * @param body тело запроса
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> verifyLogin(BrowserSession pending, String body)
            throws IOException, InterruptedException {
        return client.postJson("/auth/login/2fa", body, pending);
    }

    /**
     * Входит в два шага с TOTP и возвращает вошедшую сессию.
     *
     * @param user пользователь с включённой 2FA
     * @return вошедшая сессия
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public BrowserSession loginWithTotp(TwoFactorUser user) throws IOException, InterruptedException {
        HttpResponse<String> response = verifyLogin(startLogin(user.email()), totp(code(user.secret())));
        nextStep();
        return client.continueSession(client.sessionCookie(response));
    }

    /**
     * Подтверждает личность паролем и TOTP.
     *
     * @param session вошедшая сессия
     * @param secret секрет пользователя
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> reauthenticate(BrowserSession session, String secret)
            throws IOException, InterruptedException {
        HttpResponse<String> response = client.postJson("/auth/reauthenticate",
                "{\"password\": \"" + PASSWORD + "\", \"secondFactor\": " + totp(code(secret)) + "}", session);
        nextStep();
        return response;
    }

    /**
     * Описывает второй фактор кодом TOTP.
     *
     * @param code шестизначный код
     * @return JSON второго фактора
     */
    public String totp(String code) {
        return "{\"method\": \"totp\", \"code\": \"" + code + "\"}";
    }

    /**
     * Описывает второй фактор резервным кодом.
     *
     * @param code резервный код
     * @return JSON второго фактора
     */
    public String recovery(String code) {
        return "{\"method\": \"recovery_code\", \"code\": \"" + code + "\"}";
    }

    /**
     * Считает код TOTP на текущее время сервера.
     *
     * @param secret секрет в Base32
     * @return шестизначный код
     */
    public String code(String secret) {
        try {
            return generator.generateOneTimePasswordString(
                    new SecretKeySpec(new Base32().decode(secret), generator.getAlgorithm()), clock.instant());
        } catch (InvalidKeyException exception) {
            throw new IllegalStateException(exception);
        }
    }

    /**
     * Передвигает часы на следующий временной шаг TOTP.
     */
    public void nextStep() {
        clock.advance(Duration.ofSeconds(30));
    }

    /**
     * Описывает текущего пользователя сессии.
     *
     * @param session сессия
     * @return ответ GET /me
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> me(BrowserSession session) throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/me")));
    }

    /**
     * Разбирает тело ответа.
     *
     * @param response ответ
     * @return JSON
     */
    public JsonNode json(HttpResponse<String> response) {
        return jsonMapper.readTree(response.body());
    }

    /**
     * Пользователь с включённой 2FA.
     *
     * @param email email
     * @param secret секрет TOTP в Base32
     * @param recoveryCodes выданные резервные коды
     * @param session сессия, в которой включена 2FA
     */
    public record TwoFactorUser(String email, String secret, List<String> recoveryCodes, BrowserSession session) {
    }
}
