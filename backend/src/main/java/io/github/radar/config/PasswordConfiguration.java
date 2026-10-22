package io.github.radar.config;

import io.github.radar.security.ConcurrencyLimitedPasswordEncoder;
import java.util.Map;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Хеширование паролей.
 *
 * <p>Argon2id с параметрами OWASP Password Storage Cheat Sheet: 19 МиБ памяти, 2 итерации,
 * параллелизм 1. Префикс {argon2} в хеше позволяет позже сменить алгоритм без миграции.
 * Число одновременных вычислений ограничено, чтобы поток запросов не исчерпал память.
 */
@Configuration
@EnableConfigurationProperties(PasswordHashingProperties.class)
public class PasswordConfiguration {
    private static final int SALT_LENGTH = 16;

    private static final int HASH_LENGTH = 32;

    private static final int PARALLELISM = 1;

    private static final int MEMORY_KIB = 19_456;

    private static final int ITERATIONS = 2;

    /**
     * Создаёт кодировщик паролей.
     *
     * @param hashing ограничение одновременных вычислений
     * @return кодировщик с Argon2id по умолчанию
     */
    @Bean
    public PasswordEncoder passwordEncoder(PasswordHashingProperties hashing) {
        PasswordEncoder argon2 = new DelegatingPasswordEncoder("argon2", Map.of("argon2",
                new Argon2PasswordEncoder(SALT_LENGTH, HASH_LENGTH, PARALLELISM, MEMORY_KIB,
                        ITERATIONS)));
        return new ConcurrencyLimitedPasswordEncoder(argon2, hashing.maxConcurrent(),
                hashing.maxWait());
    }
}
