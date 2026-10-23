package io.github.radar.security;

import io.github.radar.exception.TooManyAttemptsException;
import java.time.Duration;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Ограничивает число одновременных вычислений хеша пароля.
 *
 * <p>Каждое вычисление Argon2id занимает заметную память и процессор. Если свободного места
 * нет дольше заданного времени, запрос получает 429, а не очередь без предела.
 */
public class ConcurrencyLimitedPasswordEncoder implements PasswordEncoder {
    private static final Duration RETRY_AFTER = Duration.ofSeconds(1);

    private final PasswordEncoder delegate;

    private final Semaphore slots;

    private final Duration maxWait;

    /**
     * Создаёт кодировщик с ограничением.
     *
     * @param delegate кодировщик, выполняющий хеширование
     * @param maxConcurrent число одновременных вычислений
     * @param maxWait сколько ждать свободного места
     */
    public ConcurrencyLimitedPasswordEncoder(
            PasswordEncoder delegate,
            int maxConcurrent,
            Duration maxWait
    ) {
        this.delegate = delegate;
        this.slots = new Semaphore(maxConcurrent, true);
        this.maxWait = maxWait;
    }

    @Override
    public String encode(CharSequence rawPassword) {
        return withSlot(() -> delegate.encode(rawPassword));
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        return withSlot(() -> delegate.matches(rawPassword, encodedPassword));
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        return delegate.upgradeEncoding(encodedPassword);
    }

    private <T> T withSlot(Supplier<T> hashing) {
        acquire();
        try {
            return hashing.get();
        } finally {
            slots.release();
        }
    }

    private void acquire() {
        try {
            if (!slots.tryAcquire(maxWait.toMillis(), TimeUnit.MILLISECONDS)) {
                throw new TooManyAttemptsException(RETRY_AFTER);
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new TooManyAttemptsException(RETRY_AFTER, exception);
        }
    }
}
