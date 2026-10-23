package io.github.radar.exception;

/**
 * Пользователь не состоит в этой компании.
 */
public class MemberNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public MemberNotFoundException() {
        super("Участник не найден");
    }
}
