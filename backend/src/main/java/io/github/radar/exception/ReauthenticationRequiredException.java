package io.github.radar.exception;

/**
 * Для действия нужно подтверждение личности не старше заданного срока в текущей сессии.
 */
public class ReauthenticationRequiredException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public ReauthenticationRequiredException() {
        super("Нужно подтвердить личность");
    }

    /**
     * Создаёт исключение с исходной причиной.
     *
     * @param cause исходная причина
     */
    public ReauthenticationRequiredException(Throwable cause) {
        super("Нужно подтвердить личность", cause);
    }
}
