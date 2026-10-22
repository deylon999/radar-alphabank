package io.github.radar.exception;

/**
 * Владелец не может выйти, не передав права другому участнику.
 */
public class OwnerCannotLeaveException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public OwnerCannotLeaveException() {
        super("Владелец не может выйти");
    }
}
