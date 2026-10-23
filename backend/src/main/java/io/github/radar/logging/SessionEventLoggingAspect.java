package io.github.radar.logging;

import java.util.UUID;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Пишет в журнал безопасности выход и завершение сессий.
 *
 * <p>Пользователь определяется по userId из MDC, сессия — по публичному ID.
 * Значение cookie и внутренний ID сессии не пишутся.
 */
@Aspect
@Component
public class SessionEventLoggingAspect {
    private static final Logger SECURITY_LOG = LoggerFactory.getLogger("radar.security");

    /**
     * Пишет выход из сессии.
     */
    @AfterReturning("execution(* io.github.radar.service.UserSessionService.logout(..))")
    public void logLogout() {
        SECURITY_LOG.info("Выход из сессии");
    }

    /**
     * Пишет завершение сессии по публичному ID.
     *
     * @param publicId публичный ID сессии
     */
    @AfterReturning(
            "execution(* io.github.radar.service.UserSessionService.revoke(..))"
                    + " && args(*, publicId, *)"
    )
    public void logRevocation(UUID publicId) {
        SECURITY_LOG.info("Завершена сессия {}", publicId);
    }

    /**
     * Пишет завершение остальных сессий пользователя.
     */
    @AfterReturning("execution(* io.github.radar.service.UserSessionService.revokeOthers(..))")
    public void logOthersRevocation() {
        SECURITY_LOG.info("Завершены остальные сессии");
    }

    /**
     * Пишет завершение сессии по абсолютному пределу.
     */
    @AfterReturning("execution(* io.github.radar.service.UserSessionService.expire(..))")
    public void logExpiration() {
        SECURITY_LOG.info("Сессия завершена по абсолютному пределу");
    }
}
