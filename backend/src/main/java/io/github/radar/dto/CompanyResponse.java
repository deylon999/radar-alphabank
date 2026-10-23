package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Профиль компании для её участников. Данные банка и сведения пользователей разделены:
 * profile и industry приходят из датасета и не передаются у компаний пользователей.
 */
@Getter
@RequiredArgsConstructor
public class CompanyResponse {
    @JsonUnwrapped
    private final CompanySummaryResponse summary;

    private final String description;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    private final List<?> facts;

    private final CompanyAnalysisResponse analysis;
}
