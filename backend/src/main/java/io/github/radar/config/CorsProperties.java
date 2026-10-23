package io.github.radar.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Адреса фронтенда, которым разрешены запросы с другого сайта.
 *
 * <p>Пустой список — фронтенд работает с того же сайта, что и API, CORS не нужен.
 *
 * @param allowedOrigins разрешённые адреса
 */
@ConfigurationProperties("radar.cors")
public record CorsProperties(@DefaultValue List<String> allowedOrigins) {
}
