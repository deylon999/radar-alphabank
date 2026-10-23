package io.github.radar.domain;

import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Заявка пользователя на вступление в компанию. Email заявителя видит владелец компании.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class JoinRequest {
    private final UUID id;

    private final String companyId;

    private final UUID applicantId;

    @ToString.Exclude
    private final String applicantEmail;

    private final JoinRequestStatus status;

    private final Position position;

    @ToString.Exclude
    private final String message;

    private final Instant createdAt;

    private final Instant decidedAt;
}
