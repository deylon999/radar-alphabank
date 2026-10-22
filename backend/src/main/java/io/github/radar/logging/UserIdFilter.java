package io.github.radar.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.Principal;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Добавляет в записи журнала UUID вошедшего пользователя. Email в MDC не попадает:
 * имя принципала — UUID ({@link io.github.radar.security.AuthenticatedUser#getName()}).
 *
 * <p>Работает внутри цепочки Spring Security, после восстановления входа из сессии.
 */
public class UserIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        Principal principal = request.getUserPrincipal();
        if (principal != null) {
            MDC.put("userId", principal.getName());
        }
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("userId");
        }
    }
}
