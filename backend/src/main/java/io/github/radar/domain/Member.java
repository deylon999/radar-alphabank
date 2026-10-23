package io.github.radar.domain;

import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Участник компании в списке участников. Email видят все участники компании.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class Member {
    private final UUID userId;

    @ToString.Exclude
    private final String email;

    private final MembershipRole role;

    private final Position position;

    private final Instant joinedAt;
}
