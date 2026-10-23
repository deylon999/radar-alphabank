package io.github.radar.dto;

import java.time.Instant;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Секрет новой настройки TOTP. Выдаётся только в этом ответе.
 */
@Getter
@RequiredArgsConstructor
public class TotpSetupResponse {
    private final String secret;

    private final String provisioningUri;

    private final Instant expiresAt;
}
