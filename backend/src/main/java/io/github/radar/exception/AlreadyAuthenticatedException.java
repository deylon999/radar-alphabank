package io.github.radar.exception;

/**
 * Вход уже выполнен в этой сессии: сначала нужно выйти.
 */
public class AlreadyAuthenticatedException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public AlreadyAuthenticatedException() {
        super("Вход уже выполнен");
    }
}
