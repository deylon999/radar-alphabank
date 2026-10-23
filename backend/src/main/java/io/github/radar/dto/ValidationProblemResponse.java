package io.github.radar.dto;

import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Ошибка валидации полей запроса по RFC 9457. detail повторяет описание первой ошибки поля.
 */
@Getter
@RequiredArgsConstructor
public class ValidationProblemResponse {
    private final String type;

    private final String title;

    private final int status;

    private final String detail;

    private final List<ValidationIssueResponse> errors;
}
