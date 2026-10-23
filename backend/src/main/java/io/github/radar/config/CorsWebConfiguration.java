package io.github.radar.config;

import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Правила CORS для фронтенда на другом сайте. По умолчанию фронтенд работает с того же сайта.
 */
@Configuration
@EnableConfigurationProperties(CorsProperties.class)
public class CorsWebConfiguration {
    /**
     * Разрешает запросы с cookie только с заданных адресов фронтенда.
     * Без адресов CORS не настраивается, и браузер не допускает запросы с чужих сайтов.
     *
     * @param corsProperties разрешённые адреса
     * @return правила CORS
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(CorsProperties corsProperties) {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        if (corsProperties.allowedOrigins().isEmpty()) {
            return source;
        }
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(corsProperties.allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        configuration.setAllowedHeaders(List.of("Content-Type", "X-CSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
