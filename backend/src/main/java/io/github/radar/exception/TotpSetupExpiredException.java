package io.github.radar.exception;

/**
 * В текущей сессии нет действующей настройки TOTP.
 */
public class TotpSetupExpiredException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public TotpSetupExpiredException() {
        super("Настройка TOTP истекла");
    }
}
