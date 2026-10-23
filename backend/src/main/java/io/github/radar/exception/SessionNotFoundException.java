package io.github.radar.exception;

/**
 * Среди действующих сессий пользователя нет сессии с таким ID: чужая, отсутствующая
 * или истёкшая сессия неразличимы.
 */
public class SessionNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public SessionNotFoundException() {
        super("Сессия не найдена");
    }
}
