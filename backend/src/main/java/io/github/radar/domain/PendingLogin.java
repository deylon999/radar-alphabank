package io.github.radar.domain;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Пароль проверен, вход ждёт второй фактор. Хранится в сессии и доступа не даёт.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class PendingLogin implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    private final UUID userId;

    private final Instant expiresAt;
}
