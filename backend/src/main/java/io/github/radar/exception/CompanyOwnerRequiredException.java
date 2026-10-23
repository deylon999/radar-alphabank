package io.github.radar.exception;

/**
 * Действие доступно только владельцу компании.
 */
public class CompanyOwnerRequiredException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public CompanyOwnerRequiredException() {
        super("Нужны права владельца");
    }
}
