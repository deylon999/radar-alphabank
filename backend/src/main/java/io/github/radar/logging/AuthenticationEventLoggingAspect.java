package io.github.radar.logging;

import io.github.radar.domain.Email;
import io.github.radar.dto.LoginRequest;
import io.github.radar.dto.LoginResponse;
import io.github.radar.dto.RegisterRequest;
import io.github.radar.dto.RegisterResponse;
import io.github.radar.exception.EmailAlreadyExistsException;
import io.github.radar.exception.InvalidCredentialsException;
import io.github.radar.exception.TooManyAttemptsException;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Пишет в журнал безопасности регистрацию и вход.
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
     * Пишет успешный вход.
     *
     * @param response описание входа
     */
    @AfterReturning(
            pointcut = "execution(* io.github.radar.service.LoginService.login(..))",
            returning = "response"
    )
    public void logLogin(LoginResponse response) {
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

    private String mask(String email) {
        return new Email(email).getValue().replaceFirst("^(.)[^@]*", "$1***");
    }
}
