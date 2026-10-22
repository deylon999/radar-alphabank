package io.github.radar.domain;

import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Членство пользователя в компании. Пользователь состоит не больше чем в одной компании.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class Membership {
    private final UUID userId;

    private final String companyId;

    private final MembershipRole role;

    private final Position position;

    private final Instant joinedAt;
}
