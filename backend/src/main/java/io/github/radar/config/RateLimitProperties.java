package io.github.radar.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Ограничения попыток входа, второго фактора и регистрации.
 *
 * @param login попытки входа
 * @param registration попытки регистрации
 * @param secondFactor попытки TOTP-кода
 */
@ConfigurationProperties("radar.rate-limit")
public record RateLimitProperties(Login login, Registration registration,
        SecondFactor secondFactor) {
    /**
     * Неудачные попытки входа, отдельно по email и по IP.
     *
     * @param emailAttempts попыток на один email за окно
     * @param ipAttempts попыток с одного IP за окно
     * @param window окно подсчёта
     */
    public record Login(int emailAttempts, int ipAttempts, Duration window) {
    }

    /**
     * Попытки регистрации с одного IP.
     *
     * @param ipAttempts попыток за окно
     * @param window окно подсчёта
     */
    public record Registration(int ipAttempts, Duration window) {
    }

    /**
     * Неудачные TOTP-коды одного пользователя. Окно длинное: шесть цифр подбираются
     * медленным, но постоянным перебором, поэтому за сутки допускается мало ошибок.
     *
     * @param userAttempts попыток на пользователя за окно
     * @param window окно подсчёта
     */
    public record SecondFactor(int userAttempts, Duration window) {
    }
}
