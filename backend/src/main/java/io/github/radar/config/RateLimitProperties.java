package io.github.radar.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Ограничения попыток входа и регистрации.
 *
 * @param login попытки входа
 * @param registration попытки регистрации
 */
@ConfigurationProperties("radar.rate-limit")
public record RateLimitProperties(Login login, Registration registration) {
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
}
