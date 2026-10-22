package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.github.radar.domain.MembershipRole;
import io.github.radar.domain.Position;
import java.time.Instant;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Членство текущего пользователя в компании.
 */
@Getter
@RequiredArgsConstructor
public class MembershipResponse {
    private final CompanySummaryResponse company;

    private final MembershipRole role;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Position position;

    private final Instant joinedAt;
}
