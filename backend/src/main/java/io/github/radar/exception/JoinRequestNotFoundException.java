package io.github.radar.exception;

/**
 * Заявки нет среди доступных пользователю заявок этой компании.
 */
public class JoinRequestNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public JoinRequestNotFoundException() {
        super("Заявка не найдена");
    }
}
