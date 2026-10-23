package io.github.radar.exception;

/**
 * Пользователь не состоит в компании. Заявка, ожидающая решения, доступа не даёт.
 */
public class CompanyMembershipRequiredException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public CompanyMembershipRequiredException() {
        super("Нет доступа к компании");
    }
}
