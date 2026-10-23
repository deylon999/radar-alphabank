package io.github.radar.dto;

import java.time.Instant;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Подтверждение личности для чувствительных действий в текущей сессии.
 */
@Getter
@RequiredArgsConstructor
public class ReauthenticationResponse {
    private final Instant confirmedAt;

    private final Instant validUntil;
}
