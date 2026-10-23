package io.github.radar.exception;

/**
 * Пользователь с таким email уже зарегистрирован.
 */
public class EmailAlreadyExistsException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение по нарушению уникальности email в базе.
     *
     * @param cause исходная ошибка базы
     */
    public EmailAlreadyExistsException(Throwable cause) {
        super("Email уже зарегистрирован", cause);
    }
}
