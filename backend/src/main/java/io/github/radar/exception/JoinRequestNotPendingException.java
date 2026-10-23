package io.github.radar.exception;

/**
 * Заявка уже одобрена, отклонена или отменена.
 */
public class JoinRequestNotPendingException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public JoinRequestNotPendingException() {
        super("Заявка уже рассмотрена");
    }
}
