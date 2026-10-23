package io.github.radar.security;

import io.github.radar.dto.ProblemDetailsResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Отвечает 401 на запрос без действующего входа. Перенаправлений и Basic-аутентификации нет.
 */
@Component
@RequiredArgsConstructor
public class ProblemAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private final ProblemResponseWriter problemResponseWriter;

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        problemResponseWriter.write(response, new ProblemDetailsResponse(
                "/problems/authentication-required",
                "Нужно войти",
                HttpServletResponse.SC_UNAUTHORIZED,
                "Сессии нет, она истекла или была отозвана."
        ));
    }
}
