package io.github.radar.exception;

import io.github.radar.dto.ProblemDetailsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Ошибки двухфакторной аутентификации.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class TwoFactorProblemHandler {
    private final ProblemResponses problemResponses;

    /**
     * Отвечает 401, если второй фактор не принят.
     *
     * @param exception отказ проверки
     * @return описание ошибки
     */
    @ExceptionHandler(InvalidSecondFactorException.class)
    public ResponseEntity<ProblemDetailsResponse> handleInvalidSecondFactor(
            InvalidSecondFactorException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/invalid-second-factor",
                "Неверный второй фактор",
                HttpStatus.UNAUTHORIZED.value(),
                "Проверка второго фактора не пройдена."
        ));
    }

    /**
     * Отвечает 401 на второй шаг входа без действующего первого шага.
     *
     * @param exception отказ
     * @return описание ошибки
     */
    @ExceptionHandler(PendingLoginRequiredException.class)
    public ResponseEntity<ProblemDetailsResponse> handlePendingLoginRequired(
            PendingLoginRequiredException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/pending-login-required",
                "Нет незавершённого входа",
                HttpStatus.UNAUTHORIZED.value(),
                "Введите email и пароль заново, чтобы начать вход."
        ));
    }

    /**
     * Отвечает 409 на настройку TOTP при уже включённой 2FA.
     *
     * @param exception отказ
     * @return описание ошибки
     */
    @ExceptionHandler(TwoFactorAlreadyEnabledException.class)
    public ResponseEntity<ProblemDetailsResponse> handleAlreadyEnabled(
            TwoFactorAlreadyEnabledException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/two-factor-already-enabled",
                "2FA уже включена",
                HttpStatus.CONFLICT.value(),
                "Чтобы настроить новый фактор, сначала отключите текущий."
        ));
    }

    /**
     * Отвечает 409 на операцию, которой нужна включённая 2FA.
     *
     * @param exception отказ
     * @return описание ошибки
     */
    @ExceptionHandler(TwoFactorNotEnabledException.class)
    public ResponseEntity<ProblemDetailsResponse> handleNotEnabled(
            TwoFactorNotEnabledException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/two-factor-not-enabled",
                "2FA не включена",
                HttpStatus.CONFLICT.value(),
                "Для этой операции нужно включить 2FA."
        ));
    }

    /**
     * Отвечает 409, если в текущей сессии нет действующей настройки TOTP.
     *
     * @param exception отказ
     * @return описание ошибки
     */
    @ExceptionHandler(TotpSetupExpiredException.class)
    public ResponseEntity<ProblemDetailsResponse> handleSetupExpired(
            TotpSetupExpiredException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/totp-setup-expired",
                "Настройка TOTP истекла",
                HttpStatus.CONFLICT.value(),
                "Начните настройку TOTP заново в текущей сессии."
        ));
    }
}
