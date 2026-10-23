package io.github.radar.security;

import io.github.radar.dto.ProblemDetailsResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * Отвечает 403 на изменяющий запрос без CSRF-токена текущей сессии.
 */
@Component
@RequiredArgsConstructor
public class CsrfAccessDeniedHandler implements AccessDeniedHandler {
    private final ProblemResponseWriter problemResponseWriter;

    @Override
    public void handle(HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException
    ) throws IOException {
        problemResponseWriter.write(response, new ProblemDetailsResponse(
                "/problems/invalid-csrf-token",
                "Неверный CSRF-токен",
                HttpServletResponse.SC_FORBIDDEN,
                "Получите CSRF-токен для текущей сессии и повторите запрос."
        ));
    }
}
