package io.github.radar.logging;

import io.github.radar.exception.InvalidSecondFactorException;
import io.github.radar.exception.TooManyAttemptsException;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Пишет в журнал безопасности настройку, включение и отключение 2FA и перевыпуск
 * резервных кодов.
 *
 * <p>Секреты, URI настройки, TOTP-коды и резервные коды не пишутся; пользователь — userId
 * из MDC.
 */
@Aspect
@Component
public class TwoFactorLoggingAspect {
    private static final Logger SECURITY_LOG = LoggerFactory.getLogger("radar.security");

    private static final String THROWN = "exception";

    private static final String ENABLE =
            "execution(* io.github.radar.service.TwoFactorService.enable(..))";

    /**
     * Пишет начало настройки TOTP.
     */
    @AfterReturning("execution(* io.github.radar.service.TwoFactorService.setup(..))")
    public void logSetup() {
        SECURITY_LOG.info("Начата настройка TOTP");
    }

    /**
     * Пишет включение 2FA.
     */
    @AfterReturning(ENABLE)
    public void logEnabled() {
        SECURITY_LOG.info("2FA включена, остальные сессии завершены");
    }

    /**
     * Пишет непринятый первый код настройки.
     *
     * @param exception отказ проверки
     */
    @AfterThrowing(pointcut = ENABLE, throwing = THROWN)
    public void logRejectedFirstCode(InvalidSecondFactorException exception) {
        SECURITY_LOG.warn("Первый код TOTP не принят, 2FA не включена");
    }

    /**
     * Пишет превышение лимита TOTP-кодов при включении 2FA.
     *
     * @param exception исчерпанный лимит
     */
    @AfterThrowing(pointcut = ENABLE, throwing = THROWN)
    public void logFirstCodeLimit(TooManyAttemptsException exception) {
        SECURITY_LOG.warn("Превышен лимит попыток TOTP-кода при включении 2FA");
    }

    /**
     * Пишет отключение 2FA.
     */
    @AfterReturning("execution(* io.github.radar.service.TwoFactorService.disable(..))")
    public void logDisabled() {
        SECURITY_LOG.info("2FA отключена, резервные коды отменены, остальные сессии завершены");
    }

    /**
     * Пишет перевыпуск резервных кодов.
     */
    @AfterReturning(
            "execution(* io.github.radar.service.TwoFactorService.regenerateRecoveryCodes(..))"
    )
    public void logRecoveryCodesRegenerated() {
        SECURITY_LOG.info("Резервные коды перевыпущены, прежние отменены");
    }
}
