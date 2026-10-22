package io.github.radar.dto;

import java.time.Instant;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Завершённый вход. Идентификатор сессии передаётся только через Set-Cookie.
 */
@Getter
@RequiredArgsConstructor
public class LoginResponse {
    private final String status;

    private final AuthenticatedUserResponse user;

    private final Instant authenticatedAt;

    private final long idleTimeoutSeconds;

    private final Instant absoluteExpiresAt;
}
