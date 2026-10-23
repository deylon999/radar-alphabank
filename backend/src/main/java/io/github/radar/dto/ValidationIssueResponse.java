package io.github.radar.dto;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Нарушение правила валидации поля: машинный код в title, описание на русском в description.
 */
@Getter
@RequiredArgsConstructor
@EqualsAndHashCode
@ToString
public class ValidationIssueResponse {
    private final String field;

    private final String title;

    private final String description;
}
