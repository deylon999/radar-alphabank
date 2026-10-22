package io.github.radar.exception;

import io.github.radar.dto.ProblemDetailsResponse;
import io.github.radar.dto.ValidationIssueResponse;
import io.github.radar.dto.ValidationProblemResponse;
import io.github.radar.validation.ValidationIssueFactory;
import jakarta.validation.ConstraintViolation;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Превращает типизированные исключения в ответы Problem Details из контракта.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class ApiExceptionHandler {
    private final ValidationIssueFactory validationIssueFactory;

    /**
     * Отвечает 422 на нарушения правил полей.
     *
     * @param exception нарушения Bean Validation
     * @return описание ошибок полей
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationProblemResponse> handleInvalidArgument(
            MethodArgumentNotValidException exception
    ) {
        return validationProblem(exception.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> validationIssueFactory.fromViolation(
                        fieldError.unwrap(ConstraintViolation.class)))
                .sorted(validationIssueFactory.order())
                .toList());
    }

    /**
     * Отвечает 422, если поле JSON имеет неверный тип или null, и 400 на некорректный JSON.
     *
     * @param exception ошибка чтения тела запроса
     * @return описание ошибки
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleUnreadableBody(HttpMessageNotReadableException exception) {
        return validationIssueFactory.fromJsonInput(exception.getMostSpecificCause())
                .<ResponseEntity<?>>map(issue -> validationProblem(List.of(issue)))
                .orElseGet(() -> problem(new ProblemDetailsResponse(
                        "/problems/malformed-request",
                        "Некорректный запрос",
                        HttpStatus.BAD_REQUEST.value(),
                        "В запросе некорректный JSON или параметр."
                )));
    }

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
        return problem(new ProblemDetailsResponse(
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
        return problem(new ProblemDetailsResponse(
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
        return problem(new ProblemDetailsResponse(
                "/problems/invalid-security-state",
                "Операция недоступна",
                HttpStatus.CONFLICT.value(),
                "Операцию нельзя выполнить в текущем состоянии входа."
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
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds))
                .body(new ProblemDetailsResponse(
                        "/problems/too-many-attempts",
                        "Слишком много попыток",
                        HttpStatus.TOO_MANY_REQUESTS.value(),
                        "Слишком много попыток. Подождите и попробуйте снова."
                ));
    }

    private ResponseEntity<ValidationProblemResponse> validationProblem(
            List<ValidationIssueResponse> issues
    ) {
        return ResponseEntity.unprocessableContent()
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(new ValidationProblemResponse(
                        "/problems/validation-failed",
                        "Ошибка валидации",
                        HttpStatus.UNPROCESSABLE_CONTENT.value(),
                        issues.getFirst().getDescription(),
                        issues
                ));
    }

    private ResponseEntity<ProblemDetailsResponse> problem(ProblemDetailsResponse body) {
        return ResponseEntity.status(body.getStatus())
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(body);
    }
}
