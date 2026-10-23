package io.github.radar.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Текущий пользователь и его отношение к компании: участник (membership есть),
 * ожидает решения по заявке (joinRequest есть) или без компании (оба null).
 */
@Getter
@RequiredArgsConstructor
public class MeResponse {
    private final AuthenticatedUserResponse user;

    private final MembershipResponse membership;

    private final JoinRequestResponse joinRequest;

    private final boolean canViewQualityMetrics;
}
