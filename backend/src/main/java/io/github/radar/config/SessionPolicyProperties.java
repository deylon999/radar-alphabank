package io.github.radar.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Сроки входа: бездействие продлевается запросами, абсолютный предел, подтверждение
 * личности и промежуточные шаги 2FA — нет.
 *
 * @param idleTimeout срок бездействия
 * @param absoluteTimeout предельный срок после завершения входа
 * @param reauthenticationTimeout срок подтверждения личности для чувствительных действий
 * @param pendingLoginTimeout срок ожидания второго фактора после проверки пароля
 * @param totpSetupTimeout срок неподтверждённой настройки TOTP
 */
@ConfigurationProperties("radar.session")
public record SessionPolicyProperties(
        Duration idleTimeout,
        Duration absoluteTimeout,
        Duration reauthenticationTimeout,
        Duration pendingLoginTimeout,
        Duration totpSetupTimeout
) {
}
