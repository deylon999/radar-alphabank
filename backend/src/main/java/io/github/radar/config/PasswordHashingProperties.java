package io.github.radar.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Ограничение одновременных вычислений хеша пароля.
 *
 * @param maxConcurrent число одновременных вычислений
 * @param maxWait сколько запрос ждёт свободного места до ответа 429
 */
@ConfigurationProperties("radar.password-hashing")
public record PasswordHashingProperties(int maxConcurrent, Duration maxWait) {
}
