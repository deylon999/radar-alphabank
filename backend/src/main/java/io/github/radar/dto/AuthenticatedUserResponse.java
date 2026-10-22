package io.github.radar.dto;

import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Пользователь, определённый сервером после проверки учётных данных.
 */
@Getter
@RequiredArgsConstructor
public class AuthenticatedUserResponse {
    private final UUID id;

    private final String email;

    private final boolean twoFactorEnabled;
}
