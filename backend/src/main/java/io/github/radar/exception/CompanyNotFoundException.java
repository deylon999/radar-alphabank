package io.github.radar.exception;

/**
 * Компании с таким ID нет.
 */
public class CompanyNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public CompanyNotFoundException() {
        super("Компания не найдена");
    }
}
