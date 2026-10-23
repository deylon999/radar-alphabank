package io.github.radar.exception;

/**
 * 2FA уже включена: новая первоначальная настройка не допускается.
 */
public class TwoFactorAlreadyEnabledException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public TwoFactorAlreadyEnabledException() {
        super("2FA уже включена");
    }
}
