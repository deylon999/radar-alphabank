package io.github.radar.exception;

/**
 * Пользователь уже состоит в компании. Состоять можно только в одной.
 */
public class AlreadyCompanyMemberException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public AlreadyCompanyMemberException() {
        super("Пользователь уже состоит в компании");
    }

    /**
     * Создаёт исключение по нарушению уникальности членства в базе.
     *
     * @param cause исходная ошибка базы
     */
    public AlreadyCompanyMemberException(Throwable cause) {
        super("Пользователь уже состоит в компании", cause);
    }
}
