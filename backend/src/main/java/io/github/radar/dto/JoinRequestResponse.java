package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.github.radar.domain.JoinRequestStatus;
import io.github.radar.domain.Position;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Заявка на вступление в компанию.
 */
@Getter
@RequiredArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class JoinRequestResponse {
    private final UUID id;

    private final CompanySummaryResponse company;

    private final JoinRequestApplicantResponse applicant;

    private final JoinRequestStatus status;

    private final Position position;

    private final String message;

    private final Instant createdAt;

    private final Instant decidedAt;
}
