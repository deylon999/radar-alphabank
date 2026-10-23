package io.github.radar.logging;

import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Пишет в журнал безопасности отказы фильтров Spring Security, до которых не доходят
 * контроллеры.
 *
 * <p>Пишутся метод и путь без параметров запроса. Токены, cookie и заголовки не пишутся.
 */
@Aspect
@Component
public class SecurityEventLoggingAspect {
    private static final int MAX_PATH_LENGTH = 200;

    private static final Logger SECURITY_LOG = LoggerFactory.getLogger("radar.security");

    /**
     * Пишет запрос к защищённой операции без действующего входа.
     *
     * @param request запрос
     */
    @AfterReturning(
            "execution(* io.github.radar.security.ProblemAuthenticationEntryPoint.commence(..))"
                    + " && args(request, ..)"
    )
    public void logAuthenticationRequired(HttpServletRequest request) {
        SECURITY_LOG.atInfo()
                .setMessage("Запрос без входа: {} {}")
                .addArgument(request::getMethod)
                .addArgument(() -> path(request))
                .log();
    }

    /**
     * Пишет изменяющий запрос, отклонённый из-за CSRF-токена.
     *
     * @param request запрос
     */
    @AfterReturning(
            "execution(* io.github.radar.security.CsrfAccessDeniedHandler.handle(..))"
                    + " && args(request, ..)"
    )
    public void logCsrfRejected(HttpServletRequest request) {
        SECURITY_LOG.atWarn()
                .setMessage("Отклонён запрос без верного CSRF-токена: {} {}")
                .addArgument(request::getMethod)
                .addArgument(() -> path(request))
                .log();
    }

    private String path(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.length() > MAX_PATH_LENGTH ? path.substring(0, MAX_PATH_LENGTH) : path;
    }
}
