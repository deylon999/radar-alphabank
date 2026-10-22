package io.github.radar.config;

import io.github.radar.logging.UserIdFilter;
import io.github.radar.security.AbsoluteSessionLimitFilter;
import io.github.radar.security.CsrfAccessDeniedHandler;
import io.github.radar.security.ProblemAuthenticationEntryPoint;
import io.github.radar.service.UserSessionService;
import jakarta.servlet.DispatcherType;
import java.util.LinkedHashMap;
import java.util.Map;
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
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter;

/**
 * Цепочка Spring Security для браузерного API: вход по сессии и защита от CSRF.
 */
@Configuration
public class SecurityConfiguration {
    /**
     * Описывает публичные операции, обязательный вход для остальных и заголовки ответов.
     *
     * @param http построитель цепочки
     * @param authenticationEntryPoint ответ на запрос без входа
     * @param csrfAccessDeniedHandler ответ на запрос без верного CSRF-токена
     * @param csrfTokenRepository хранилище CSRF-токенов в сессии
     * @param securityContextRepository хранилище входа в сессии
     * @param userSessionService сроки сессий
     * @return цепочка фильтров
     */
    @Bean
    @SuppressWarnings("PMD.SignatureDeclareThrowsException")
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ProblemAuthenticationEntryPoint authenticationEntryPoint,
            CsrfAccessDeniedHandler csrfAccessDeniedHandler,
            CsrfTokenRepository csrfTokenRepository,
            SecurityContextRepository securityContextRepository,
            UserSessionService userSessionService
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
                .requestCache(cache -> cache.requestCache(new NullRequestCache()))
                .addFilterAfter(new AbsoluteSessionLimitFilter(userSessionService),
                        SecurityContextHolderFilter.class)
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
}
