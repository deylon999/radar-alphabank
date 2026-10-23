package io.github.radar.security;

import java.io.Serial;
import java.io.Serializable;
import java.security.Principal;
import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Вошедший пользователь, которого хранит сессия. Хеш пароля в сессию не попадает.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class AuthenticatedUser implements Principal, Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    private final UUID id;

    private final String email;

    /**
     * Возвращает UUID пользователя: им вход идентифицируется в журналах и сессиях.
     *
     * @return UUID пользователя строкой
     */
    @Override
    public String getName() {
        return id.toString();
    }
}
