package io.github.radar.exception;

import java.time.Duration;
import lombok.Getter;

/**
 * Временно исчерпан лимит попыток.
 */
@Getter
public class TooManyAttemptsException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final transient Duration retryAfter;

    /**
     * Создаёт исключение.
     *
     * @param retryAfter минимальное время до следующей попытки
     */
    public TooManyAttemptsException(Duration retryAfter) {
        super("Слишком много попыток");
        this.retryAfter = retryAfter;
    }

    /**
     * Создаёт исключение с исходной причиной.
     *
     * @param retryAfter минимальное время до следующей попытки
     * @param cause исходная причина
     */
    public TooManyAttemptsException(Duration retryAfter, Throwable cause) {
        super("Слишком много попыток", cause);
        this.retryAfter = retryAfter;
    }
}
