package io.github.radar;

import com.redis.testcontainers.RedisContainer;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.utility.DockerImageName;

/**
 * Настоящий Redis для интеграционных тестов.
 */
@TestConfiguration(proxyBeanMethods = false)
public class RedisContainerConfiguration {
    @Bean
    @ServiceConnection
    RedisContainer redisContainer() {
        return new RedisContainer(DockerImageName.parse("redis:8-alpine"));
    }
}
