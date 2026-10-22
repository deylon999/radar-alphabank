package io.github.radar.domain;

import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Пользователь приложения. Членство в компании хранится отдельно.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class User {
    private final UUID id;

    private final String email;

    @ToString.Exclude
    private final String passwordHash;

    private final boolean canViewQualityMetrics;
}
