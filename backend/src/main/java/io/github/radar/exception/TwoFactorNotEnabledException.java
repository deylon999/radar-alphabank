package io.github.radar.exception;

/**
 * Операция требует включённой 2FA.
 */
public class TwoFactorNotEnabledException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public TwoFactorNotEnabledException() {
        super("2FA не включена");
    }
}
