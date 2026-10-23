package io.github.radar.domain;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Неподтверждённая настройка TOTP в сессии. Секрет хранится зашифрованным:
 * сессия лежит в Redis.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class TotpSetup implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    @ToString.Exclude
    private final byte[] secretCiphertext;

    private final Instant expiresAt;
}
