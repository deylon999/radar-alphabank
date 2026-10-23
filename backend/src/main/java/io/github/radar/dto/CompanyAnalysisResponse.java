package io.github.radar.dto;

import io.github.radar.domain.AnalysisStatus;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Состояние аналитики компании.
 */
@Getter
@RequiredArgsConstructor
public class CompanyAnalysisResponse {
    private final AnalysisStatus status;
}
