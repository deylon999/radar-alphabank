package io.github.radar.security;

import io.github.radar.service.UserSessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Завершает сессию, если с момента входа прошёл абсолютный предел.
 *
 * <p>Запрос продолжается как анонимный: защищённые операции отвечают 401,
 * а Spring Session удаляет cookie завершённой сессии.
 */
public class AbsoluteSessionLimitFilter extends OncePerRequestFilter {
    private final UserSessionService userSessionService;

    /**
     * Создаёт фильтр.
     *
     * @param userSessionService сроки сессий
     */
    public AbsoluteSessionLimitFilter(UserSessionService userSessionService) {
        this.userSessionService = userSessionService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session != null && userSessionService.isPastAbsoluteLimit(session)) {
            userSessionService.expire(session);
            SecurityContextHolder.getContextHolderStrategy().clearContext();
        }
        filterChain.doFilter(request, response);
    }
}
