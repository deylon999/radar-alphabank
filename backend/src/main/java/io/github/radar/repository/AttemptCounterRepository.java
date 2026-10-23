package io.github.radar.repository;

import io.github.radar.domain.AttemptCount;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Repository;

/**
 * Счётчики попыток в Redis с окном фиксированной длины.
 *
 * <p>Увеличение и установка срока выполняются одним Lua-скриптом: параллельные запросы
 * не теряют попытки, а повторные попытки не продлевают окно.
 */
@Repository
@RequiredArgsConstructor
public class AttemptCounterRepository {
    @SuppressWarnings("rawtypes")
    private static final RedisScript<List> INCREMENT_SCRIPT = RedisScript.of(
            """
            local attempts = redis.call('INCR', KEYS[1])
            if attempts == 1 then
                redis.call('PEXPIRE', KEYS[1], ARGV[1])
            end
            return {attempts, redis.call('PTTL', KEYS[1])}
            """,
            List.class
    );

    private static final RedisScript<Long> DECREMENT_SCRIPT = RedisScript.of(
            """
            if redis.call('EXISTS', KEYS[1]) == 1 then
                return redis.call('DECR', KEYS[1])
            end
            return 0
            """,
            Long.class
    );

    private final StringRedisTemplate redis;

    /**
     * Учитывает попытку. Первая попытка открывает окно заданной длины.
     *
     * @param key ключ счётчика
     * @param window длина окна
     * @return число попыток в окне и время до его окончания
     */
    public AttemptCount increment(String key, Duration window) {
        List<?> result = redis.execute(INCREMENT_SCRIPT, List.of(key),
                String.valueOf(window.toMillis()));
        return new AttemptCount(
                ((Number) result.get(0)).longValue(),
                Duration.ofMillis(((Number) result.get(1)).longValue())
        );
    }

    /**
     * Снимает одну попытку, если окно ещё открыто.
     *
     * @param key ключ счётчика
     */
    public void decrement(String key) {
        redis.execute(DECREMENT_SCRIPT, List.of(key));
    }

    /**
     * Удаляет счётчик.
     *
     * @param key ключ счётчика
     */
    public void reset(String key) {
        redis.delete(key);
    }
}
