package io.github.radar.exception;

/**
 * У пользователя есть заявка, ожидающая решения. Сначала её нужно отменить.
 */
public class JoinRequestPendingException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public JoinRequestPendingException() {
        super("Заявка ожидает решения");
    }

    /**
     * Создаёт исключение по нарушению уникальности ожидающей заявки в базе.
     *
     * @param cause исходная ошибка базы
     */
    public JoinRequestPendingException(Throwable cause) {
        super("Заявка ожидает решения", cause);
    }
}
