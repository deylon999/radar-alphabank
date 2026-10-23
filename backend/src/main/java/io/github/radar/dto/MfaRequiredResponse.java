package io.github.radar.dto;

import java.time.Instant;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Пароль проверен, нужен второй фактор. Доступа к защищённым операциям ещё нет.
 */
@Getter
@RequiredArgsConstructor
public final class MfaRequiredResponse implements LoginResponse {
    private final String status;

    private final Instant expiresAt;
}
