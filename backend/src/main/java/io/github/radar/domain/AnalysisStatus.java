package io.github.radar.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Готовность аналитики компании. needs_context — подтверждённых сведений недостаточно,
 * preparing — аналитика готовится, ready — аналитика сформирована.
 */
public enum AnalysisStatus {
    @JsonProperty("needs_context")
    NEEDS_CONTEXT,

    @JsonProperty("preparing")
    PREPARING,

    @JsonProperty("ready")
    READY
}
