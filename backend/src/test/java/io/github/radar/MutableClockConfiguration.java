package io.github.radar;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Подменяет часы приложения управляемыми.
 */
@TestConfiguration(proxyBeanMethods = false)
public class MutableClockConfiguration {
    @Bean
    @Primary
    MutableClock mutableClock() {
        return new MutableClock();
    }
}
