package io.github.radar.logging;

import io.github.radar.exception.InvalidReauthenticationException;
import io.github.radar.exception.ReauthenticationRequiredException;
import io.github.radar.exception.TooManyAttemptsException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Пишет в журнал безопасности подтверждение личности и чувствительные действия.
 *
 * <p>Пароли не пишутся; пользователь — userId из MDC. Попытка чувствительного действия
 * без подтверждения пишется на границе контроллера, одной записью на запрос.
 */
@Aspect
@Component
public class SensitiveActionLoggingAspect {
    private static final Logger SECURITY_LOG = LoggerFactory.getLogger("radar.security");

    private static final String THROWN = "exception";

    private static final String REAUTHENTICATE =
            "execution(* io.github.radar.service.ReauthenticationService.reauthenticate(..))"
                    + " && args(*, *, httpRequest)";

    /**
     * Пишет успешное подтверждение личности.
     */
    @AfterReturning(
            "execution(* io.github.radar.service.ReauthenticationService.reauthenticate(..))"
    )
    public void logConfirmation() {
        SECURITY_LOG.info("Личность подтверждена для чувствительных действий");
    }

    /**
     * Пишет неудачное подтверждение личности.
     *
     * @param httpRequest текущий запрос
     * @param exception отказ
     */
    @AfterThrowing(pointcut = REAUTHENTICATE, throwing = THROWN)
    public void logFailedConfirmation(HttpServletRequest httpRequest,
            InvalidReauthenticationException exception) {
        SECURITY_LOG.atWarn()
                .setMessage("Подтверждение личности не пройдено, IP {}")
                .addArgument(httpRequest::getRemoteAddr)
                .log();
    }

    /**
     * Пишет превышение лимита попыток при подтверждении личности.
     *
     * @param httpRequest текущий запрос
     * @param exception исчерпанный лимит
     */
    @AfterThrowing(pointcut = REAUTHENTICATE, throwing = THROWN)
    public void logConfirmationLimit(HttpServletRequest httpRequest,
            TooManyAttemptsException exception) {
        SECURITY_LOG.atWarn()
                .setMessage("Превышен лимит попыток подтверждения личности, IP {}")
                .addArgument(httpRequest::getRemoteAddr)
                .log();
    }

    /**
     * Пишет смену пароля.
     */
    @AfterReturning("execution(* io.github.radar.service.PasswordChangeService.change(..))")
    public void logPasswordChange() {
        SECURITY_LOG.info("Пароль изменён, остальные сессии завершены");
    }

    /**
     * Пишет передачу прав владельца.
     *
     * @param companyId ID компании
     * @param userId ID нового владельца
     */
    @AfterReturning(
            "execution(* io.github.radar.service.MemberService.transferOwnership(..))"
                    + " && args(companyId, userId, *, *)"
    )
    public void logOwnershipTransfer(String companyId, UUID userId) {
        SECURITY_LOG.info("Права владельца компании {} переданы пользователю {}",
                companyId, userId);
    }

    /**
     * Пишет попытку чувствительного действия без свежего подтверждения личности.
     *
     * @param exception отказ
     */
    @AfterThrowing(
            pointcut = "@within(org.springframework.web.bind.annotation.RestController)",
            throwing = THROWN
    )
    public void logMissingConfirmation(ReauthenticationRequiredException exception) {
        HttpServletRequest request =
                ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
                        .getRequest();
        SECURITY_LOG.atWarn()
                .setMessage("Чувствительное действие без подтверждения личности: {} {}")
                .addArgument(request::getMethod)
                .addArgument(() -> request.getAttribute(
                        HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE))
                .log();
    }
}
