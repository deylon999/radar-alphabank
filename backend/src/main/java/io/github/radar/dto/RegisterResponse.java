package io.github.radar.dto;

import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * ID созданного пользователя. Вход ещё не выполнен.
 */
@Getter
@RequiredArgsConstructor
public class RegisterResponse {
    private final UUID id;
}
