package io.github.radar.exception;

import io.github.radar.dto.ProblemDetailsResponse;
import io.github.radar.dto.ValidationProblemResponse;
import io.github.radar.validation.ValidationIssueFactory;
import jakarta.validation.ConstraintViolation;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Ошибки формата запроса и валидации полей: 400 и 422.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class RequestProblemHandler {
    private final ValidationIssueFactory validationIssueFactory;

    private final ProblemResponses problemResponses;

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
        return problemResponses.validationProblem(exception.getBindingResult().getFieldErrors()
                .stream()
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
                .<ResponseEntity<?>>map(issue -> problemResponses.validationProblem(List.of(issue)))
                .orElseGet(problemResponses::malformedRequest);
    }

    /**
     * Отвечает 400, если параметр пути или запроса имеет неверный формат.
     *
     * @param exception ошибка преобразования параметра
     * @return описание ошибки
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemDetailsResponse> handleMalformedParameter(
            MethodArgumentTypeMismatchException exception
    ) {
        return problemResponses.malformedRequest();
    }
}
