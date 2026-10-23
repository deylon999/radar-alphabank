package io.github.radar.exception;

/**
 * Отменить заявку может только заявитель. Владелец вместо отмены отклоняет заявку.
 */
public class JoinRequestApplicantRequiredException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * Создаёт исключение.
     */
    public JoinRequestApplicantRequiredException() {
        super("Отменить может только заявитель");
    }
}
