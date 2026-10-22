package io.github.radar.validation;

import io.github.radar.dto.ValidationIssueResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Payload;
import java.util.Comparator;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.exc.InvalidFormatException;
import tools.jackson.databind.exc.InvalidNullException;
import tools.jackson.databind.exc.MismatchedInputException;

/**
 * Превращает нарушения Bean Validation в ошибки полей из контракта.
 *
 * <p>Код берётся из payload ограничения ({@link ValidationCode}), описание — из его сообщения.
 */
@Component
public class ValidationIssueFactory {
    /**
     * Создаёт ошибку поля по нарушению.
     *
     * @param violation нарушение
     * @return ошибка поля
     */
    public ValidationIssueResponse fromViolation(ConstraintViolation<?> violation) {
        return new ValidationIssueResponse(
                violation.getPropertyPath().toString(),
                code(violation),
                violation.getMessage()
        );
    }

    /**
     * Создаёт ошибку поля по ошибке разбора JSON, если она относится к конкретному полю:
     * явный null в обязательном поле или значение другого типа. Ошибки синтаксиса JSON
     * к полю не относятся и дают пустой результат.
     *
     * @param cause причина ошибки чтения тела запроса
     * @return ошибка поля или пустой результат
     */
    public Optional<ValidationIssueResponse> fromJsonInput(Throwable cause) {
        if (!(cause instanceof MismatchedInputException mismatch) || mismatch.getPath().isEmpty()) {
            return Optional.empty();
        }
        String field = mismatch.getPath().stream()
                .map(JacksonException.Reference::getPropertyName)
                .filter(Objects::nonNull)
                .collect(Collectors.joining("."));
        if (mismatch instanceof InvalidFormatException format && format.getTargetType().isEnum()) {
            return Optional.of(new ValidationIssueResponse(
                    field, "INVALID_ENUM_VALUE", "Выберите значение из списка."));
        }
        if (mismatch instanceof InvalidNullException) {
            return Optional.of(new ValidationIssueResponse(
                    field, "MUST_NOT_BE_NULL", "Значение не может быть null."));
        }
        return Optional.of(new ValidationIssueResponse(
                field, "INVALID_TYPE", "Значение имеет неверный тип."));
    }

    /**
     * Задаёт порядок ошибок в ответе: по имени поля, затем по коду.
     *
     * @return порядок ошибок
     */
    public Comparator<ValidationIssueResponse> order() {
        return Comparator.comparing(ValidationIssueResponse::getField)
                .thenComparing(ValidationIssueResponse::getTitle);
    }

    private String code(ConstraintViolation<?> violation) {
        Class<? extends Payload> payload = violation.getConstraintDescriptor().getPayload()
                .iterator()
                .next();
        return payload.getSimpleName()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .toUpperCase(Locale.ROOT);
    }
}
