package io.github.radar.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Сроки входа: бездействие продлевается запросами, абсолютный предел — нет.
 *
 * @param idleTimeout срок бездействия
 * @param absoluteTimeout предельный срок после завершения входа
 */
@ConfigurationProperties("radar.session")
public record SessionPolicyProperties(Duration idleTimeout, Duration absoluteTimeout) {
}
