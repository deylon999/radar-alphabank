package io.github.radar.exception;

import io.github.radar.dto.ProblemDetailsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Ошибки регистрации, входа, сессий и лимитов попыток.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class AuthProblemHandler {
    private final ProblemResponses problemResponses;

    /**
     * Отвечает 409, если email уже занят.
     *
     * @param exception исключение регистрации
     * @return описание ошибки
     */
    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ProblemDetailsResponse> handleEmailAlreadyExists(
            EmailAlreadyExistsException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/email-already-exists",
                "Email уже занят",
                HttpStatus.CONFLICT.value(),
                "Пользователь с таким email уже существует."
        ));
    }

    /**
     * Отвечает 401 одинаково для неверного пароля и неизвестного email.
     *
     * @param exception отказ проверки учётных данных
     * @return описание ошибки
     */
    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ProblemDetailsResponse> handleInvalidCredentials(
            InvalidCredentialsException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/invalid-credentials",
                "Неверные учётные данные",
                HttpStatus.UNAUTHORIZED.value(),
                "Неверный email или пароль."
        ));
    }

    /**
     * Отвечает 409 на вход в сессии, где вход уже выполнен.
     *
     * @param exception исключение входа
     * @return описание ошибки
     */
    @ExceptionHandler(AlreadyAuthenticatedException.class)
    public ResponseEntity<ProblemDetailsResponse> handleAlreadyAuthenticated(
            AlreadyAuthenticatedException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/invalid-security-state",
                "Операция недоступна",
                HttpStatus.CONFLICT.value(),
                "Операцию нельзя выполнить в текущем состоянии входа."
        ));
    }

    /**
     * Отвечает 404 одинаково для чужой, отсутствующей и истёкшей сессии.
     *
     * @param exception исключение поиска сессии
     * @return описание ошибки
     */
    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<ProblemDetailsResponse> handleSessionNotFound(
            SessionNotFoundException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/session-not-found",
                "Сессия не найдена",
                HttpStatus.NOT_FOUND.value(),
                "Среди ваших действующих сессий такой нет."
        ));
    }

    /**
     * Отвечает 429 с минимальным временем ожидания в Retry-After.
     *
     * @param exception исчерпанный лимит
     * @return описание ошибки
     */
    @ExceptionHandler(TooManyAttemptsException.class)
    public ResponseEntity<ProblemDetailsResponse> handleTooManyAttempts(
            TooManyAttemptsException exception
    ) {
        long retryAfterSeconds =
                Math.max(1, Math.ceilDiv(exception.getRetryAfter().toMillis(), 1000));
        ResponseEntity<ProblemDetailsResponse> response = problemResponses.problem(
                new ProblemDetailsResponse(
                        "/problems/too-many-attempts",
                        "Слишком много попыток",
                        HttpStatus.TOO_MANY_REQUESTS.value(),
                        "Слишком много попыток. Подождите и попробуйте снова."
                ));
        return ResponseEntity.status(response.getStatusCode())
                .headers(response.getHeaders())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds))
                .body(response.getBody());
    }

    /**
     * Отвечает 401, если повторная проверка личности не пройдена. Вход не завершается.
     *
     * @param exception отказ проверки
     * @return описание ошибки
     */
    @ExceptionHandler(InvalidReauthenticationException.class)
    public ResponseEntity<ProblemDetailsResponse> handleInvalidReauthentication(
            InvalidReauthenticationException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/invalid-reauthentication",
                "Подтверждение не пройдено",
                HttpStatus.UNAUTHORIZED.value(),
                "Не удалось подтвердить личность."
        ));
    }

    /**
     * Отвечает 403, если для действия нужно свежее подтверждение личности.
     *
     * @param exception отказ
     * @return описание ошибки
     */
    @ExceptionHandler(ReauthenticationRequiredException.class)
    public ResponseEntity<ProblemDetailsResponse> handleReauthenticationRequired(
            ReauthenticationRequiredException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/reauthentication-required",
                "Нужно подтвердить личность",
                HttpStatus.FORBIDDEN.value(),
                "Перед этой операцией подтвердите личность."
        ));
    }
}
