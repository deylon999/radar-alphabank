package io.github.radar.config;

import io.github.radar.logging.UserIdFilter;
import io.github.radar.security.CsrfAccessDeniedHandler;
import io.github.radar.security.ProblemAuthenticationEntryPoint;
import jakarta.servlet.DispatcherType;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.security.web.access.DelegatingAccessDeniedHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Цепочка Spring Security для браузерного API: вход по сессии и защита от CSRF.
 */
@Configuration
@EnableConfigurationProperties(CorsProperties.class)
public class SecurityConfiguration {
    /**
     * Описывает публичные операции, обязательный вход для остальных и заголовки ответов.
     *
     * @param http построитель цепочки
     * @param authenticationEntryPoint ответ на запрос без входа
     * @param csrfAccessDeniedHandler ответ на запрос без верного CSRF-токена
     * @param csrfTokenRepository хранилище CSRF-токенов в сессии
     * @param securityContextRepository хранилище входа в сессии
     * @return цепочка фильтров
     */
    @Bean
    @SuppressWarnings("PMD.SignatureDeclareThrowsException")
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ProblemAuthenticationEntryPoint authenticationEntryPoint,
            CsrfAccessDeniedHandler csrfAccessDeniedHandler,
            CsrfTokenRepository csrfTokenRepository,
            SecurityContextRepository securityContextRepository
    ) throws Exception {
        return http
                .authorizeHttpRequests(requests -> requests
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.GET, "/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/auth/register", "/auth/login")
                        .permitAll()
                        .anyRequest().authenticated())
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.csrfTokenRepository(csrfTokenRepository))
                .securityContext(context -> context
                        .securityContextRepository(securityContextRepository))
                .logout(AbstractHttpConfigurer::disable)
                .addFilterAfter(new UserIdFilter(), SecurityContextHolderAwareRequestFilter.class)
                .headers(headers -> headers
                        .cacheControl(HeadersConfigurer.CacheControlConfig::disable)
                        .addHeaderWriter(new StaticHeadersWriter("Cache-Control", "no-store")))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler(csrfAccessDeniedHandler)))
                .build();
    }

    private AccessDeniedHandler accessDeniedHandler(CsrfAccessDeniedHandler csrfHandler) {
        return new DelegatingAccessDeniedHandler(
                new LinkedHashMap<>(Map.of(CsrfException.class, csrfHandler)),
                new AccessDeniedHandlerImpl()
        );
    }

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
