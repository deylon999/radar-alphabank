package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Описание ошибки по RFC 9457. Клиент различает случаи по type, а не по русскому тексту.
 */
@Getter
@RequiredArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProblemDetailsResponse {
    private final String type;

    private final String title;

    private final int status;

    private final String detail;
}
