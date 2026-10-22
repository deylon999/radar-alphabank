package io.github.radar.exception;

/**
 * Пользователь не состоит в компании, поэтому членства нет.
 */
public class MembershipNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public MembershipNotFoundException() {
        super("Членства нет");
    }
}
