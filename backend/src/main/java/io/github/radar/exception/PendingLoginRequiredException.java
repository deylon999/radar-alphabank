package io.github.radar.exception;

/**
 * Нет незавершённого входа или истёк срок ожидания второго фактора.
 */
public class PendingLoginRequiredException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public PendingLoginRequiredException() {
        super("Нет незавершённого входа");
    }
}
