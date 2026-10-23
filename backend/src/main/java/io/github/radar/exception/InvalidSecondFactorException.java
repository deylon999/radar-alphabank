package io.github.radar.exception;

import java.util.UUID;
import lombok.Getter;

/**
 * Второй фактор неверен, устарел или уже использован.
 *
 * <p>Хранит ID пользователя для журнала безопасности: на втором шаге входа пользователь
 * ещё не вошёл и в контексте запроса его нет.
 */
@Getter
public class InvalidSecondFactorException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final UUID userId;

    /**
     * Создаёт исключение.
     *
     * @param userId ID пользователя, чей фактор не принят
     */
    public InvalidSecondFactorException(UUID userId) {
        super("Второй фактор не принят");
        this.userId = userId;
    }
}
