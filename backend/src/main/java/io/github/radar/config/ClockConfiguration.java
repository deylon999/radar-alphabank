package io.github.radar.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Часы приложения. Сроки считаются от них, поэтому в тестах их можно подменить.
 */
@Configuration
public class ClockConfiguration {
    /**
     * Часы в UTC.
     *
     * @return часы
     */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
