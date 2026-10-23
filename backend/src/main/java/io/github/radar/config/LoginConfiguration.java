package io.github.radar.config;

import io.github.radar.security.DatabaseUserDetailsService;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

/**
 * Проверка пароля и хранение входа и CSRF-токена в сессии.
 */
@Configuration
@EnableConfigurationProperties({SessionPolicyProperties.class, RateLimitProperties.class})
public class LoginConfiguration {
    /**
     * Хранит CSRF-токен в HTTP-сессии, которую Spring Session держит в Redis.
     *
     * @return хранилище токенов
     */
    @Bean
    public CsrfTokenRepository csrfTokenRepository() {
        return new HttpSessionCsrfTokenRepository();
    }

    /**
     * Хранит вход в HTTP-сессии. Вход сохраняется явно при его завершении.
     *
     * @return хранилище входа
     */
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    /**
     * При входе меняет ID сессии и выдаёт новый CSRF-токен, чтобы выданные до входа
     * cookie и токен не давали доступа.
     *
     * @param csrfTokenRepository хранилище CSRF-токенов
     * @return действия при входе
     */
    @Bean
    public SessionAuthenticationStrategy sessionAuthenticationStrategy(
            CsrfTokenRepository csrfTokenRepository
    ) {
        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(),
                new CsrfAuthenticationStrategy(csrfTokenRepository)
        ));
    }

    /**
     * Проверяет пароль по хешу. Для неизвестного email тоже вычисляется хеш,
     * чтобы время ответа не выдавало существование аккаунта.
     *
     * @param userDetailsService загрузка учётных данных
     * @param passwordEncoder кодировщик паролей
     * @return проверка учётных данных
     */
    @Bean
    public AuthenticationManager authenticationManager(
            DatabaseUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder
    ) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
}
