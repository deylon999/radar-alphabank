package io.github.radar.exception;

/**
 * Email или пароль не прошли проверку. Причина не раскрывает существование аккаунта.
 */
public class InvalidCredentialsException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение по отказу проверки пароля.
     *
     * @param cause исходный отказ Spring Security
     */
    public InvalidCredentialsException(Throwable cause) {
        super("Неверные учётные данные", cause);
    }
}
