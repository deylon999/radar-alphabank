package io.github.radar.logging;

import io.github.radar.domain.Email;
import io.github.radar.dto.AuthenticatedLoginResponse;
import io.github.radar.dto.LoginRequest;
import io.github.radar.dto.MfaRequiredResponse;
import io.github.radar.dto.RegisterRequest;
import io.github.radar.dto.RegisterResponse;
import io.github.radar.exception.EmailAlreadyExistsException;
import io.github.radar.exception.InvalidCredentialsException;
import io.github.radar.exception.InvalidSecondFactorException;
import io.github.radar.exception.TooManyAttemptsException;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Пишет в журнал безопасности регистрацию и вход, включая второй шаг входа с 2FA.
 *
 * <p>Пользователь определяется по UUID, email пишется только в маске, пароль не пишется.
 * Отдельный advice на каждый тип исключения: AspectJ сам выбирает его по типу.
 */
@Aspect
@Component
public class AuthenticationEventLoggingAspect {
    private static final Logger SECURITY_LOG = LoggerFactory.getLogger("radar.security");

    private static final String THROWN = "exception";

    private static final String REGISTER =
            "execution(* io.github.radar.service.RegistrationService.register(..))"
                    + " && args(request, ip)";

    private static final String LOGIN =
            "execution(* io.github.radar.service.LoginService.login(..))"
                    + " && args(request, *, httpRequest, *)";

    private static final String SECOND_STEP =
            "execution(* io.github.radar.service.SecondFactorLoginService.verify(..))"
                    + " && args(*, httpRequest, *)";

    /**
     * Пишет успешную регистрацию.
     *
     * @param response ID созданного пользователя
     */
    @AfterReturning(
            pointcut = "execution(* io.github.radar.service.RegistrationService.register(..))",
            returning = "response"
    )
    public void logRegistration(RegisterResponse response) {
        SECURITY_LOG.atInfo()
                .setMessage("Зарегистрирован пользователь {}")
                .addArgument(response::getId)
                .log();
    }

    /**
     * Пишет попытку регистрации на занятый email.
     *
     * @param request данные регистрации
     * @param ip адрес клиента
     * @param exception отказ регистрации
     */
    @AfterThrowing(pointcut = REGISTER, throwing = THROWN)
    public void logTakenEmail(RegisterRequest request, String ip,
            EmailAlreadyExistsException exception) {
        SECURITY_LOG.atInfo()
                .setMessage("Регистрация отклонена, email уже занят: {}, IP {}")
                .addArgument(() -> mask(request.getEmail()))
                .addArgument(ip)
                .log();
    }

    /**
     * Пишет превышение лимита регистраций.
     *
     * @param request данные регистрации
     * @param ip адрес клиента
     * @param exception исчерпанный лимит
     */
    @AfterThrowing(pointcut = REGISTER, throwing = THROWN)
    public void logRegistrationLimit(RegisterRequest request, String ip,
            TooManyAttemptsException exception) {
        SECURITY_LOG.atWarn()
                .setMessage("Превышен лимит попыток регистрации: IP {}")
                .addArgument(ip)
                .log();
    }

    /**
     * Пишет завершённый вход, по паролю или вторым шагом.
     *
     * @param response описание входа
     */
    @AfterReturning(
            pointcut = "execution(* io.github.radar.service.LoginService.login(..))"
                    + " || execution(* io.github.radar.service.SecondFactorLoginService"
                    + ".verify(..))",
            returning = "response"
    )
    public void logLogin(AuthenticatedLoginResponse response) {
        SECURITY_LOG.atInfo()
                .setMessage("Вход выполнен: пользователь {}")
                .addArgument(() -> response.getUser().getId())
                .log();
    }

    /**
     * Пишет неудачный вход.
     *
     * @param request данные входа
     * @param httpRequest текущий запрос
     * @param exception отказ проверки учётных данных
     */
    @AfterThrowing(pointcut = LOGIN, throwing = THROWN)
    public void logFailedLogin(LoginRequest request, HttpServletRequest httpRequest,
            InvalidCredentialsException exception) {
        SECURITY_LOG.atWarn()
                .setMessage("Неудачный вход: email {}, IP {}")
                .addArgument(() -> mask(request.getEmail()))
                .addArgument(httpRequest::getRemoteAddr)
                .log();
    }

    /**
     * Пишет превышение лимита попыток входа.
     *
     * @param request данные входа
     * @param httpRequest текущий запрос
     * @param exception исчерпанный лимит
     */
    @AfterThrowing(pointcut = LOGIN, throwing = THROWN)
    public void logLoginLimit(LoginRequest request, HttpServletRequest httpRequest,
            TooManyAttemptsException exception) {
        SECURITY_LOG.atWarn()
                .setMessage("Превышен лимит попыток входа: email {}, IP {}")
                .addArgument(() -> mask(request.getEmail()))
                .addArgument(httpRequest::getRemoteAddr)
                .log();
    }

    /**
     * Пишет проверенный пароль, после которого вход ждёт второй фактор.
     *
     * @param request данные входа
     * @param response ожидание второго фактора
     */
    @AfterReturning(
            pointcut = "execution(* io.github.radar.service.LoginService.login(..))"
                    + " && args(request, ..)",
            returning = "response"
    )
    public void logPendingLogin(LoginRequest request, MfaRequiredResponse response) {
        SECURITY_LOG.atInfo()
                .setMessage("Пароль принят, вход ждёт второй фактор: email {}")
                .addArgument(() -> mask(request.getEmail()))
                .log();
    }

    /**
     * Пишет непринятый второй фактор при входе.
     *
     * @param httpRequest текущий запрос
     * @param exception отказ проверки
     */
    @AfterThrowing(pointcut = SECOND_STEP, throwing = THROWN)
    public void logRejectedSecondFactor(HttpServletRequest httpRequest,
            InvalidSecondFactorException exception) {
        SECURITY_LOG.atWarn()
                .setMessage("Второй фактор при входе не принят: пользователь {}, IP {}")
                .addArgument(exception::getUserId)
                .addArgument(httpRequest::getRemoteAddr)
                .log();
    }

    /**
     * Пишет превышение лимита TOTP-кодов на втором шаге входа.
     *
     * @param httpRequest текущий запрос
     * @param exception исчерпанный лимит
     */
    @AfterThrowing(pointcut = SECOND_STEP, throwing = THROWN)
    public void logSecondFactorLimit(HttpServletRequest httpRequest,
            TooManyAttemptsException exception) {
        SECURITY_LOG.atWarn()
                .setMessage("Превышен лимит попыток второго фактора при входе: IP {}")
                .addArgument(httpRequest::getRemoteAddr)
                .log();
    }

    private String mask(String email) {
        return new Email(email).getValue().replaceFirst("^(.)[^@]*", "$1***");
    }
}
