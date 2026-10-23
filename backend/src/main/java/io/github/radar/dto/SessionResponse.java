package io.github.radar.dto;

import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Действующая сессия текущего пользователя. id — публичный, не значение cookie.
 */
@Getter
@RequiredArgsConstructor
public class SessionResponse {
    private final UUID id;

    private final String browser;

    private final String os;

    private final Instant authenticatedAt;

    private final Instant lastAccessedAt;

    private final boolean current;
}
