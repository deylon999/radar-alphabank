package io.github.radar.exception;

/**
 * Повторная проверка личности не пройдена. Действующий вход не завершается.
 */
public class InvalidReauthenticationException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public InvalidReauthenticationException() {
        super("Подтверждение не пройдено");
    }

    /**
     * Создаёт исключение с исходной причиной.
     *
     * @param cause исходная причина
     */
    public InvalidReauthenticationException(Throwable cause) {
        super("Подтверждение не пройдено", cause);
    }
}
