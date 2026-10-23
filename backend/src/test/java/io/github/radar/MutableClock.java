package io.github.radar;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Часы, которые тест передвигает вручную: сроки проверяются без ожидания.
 */
public class MutableClock extends Clock {
    private Instant now = Instant.now();

    /**
     * Ставит часы на текущее реальное время.
     */
    public void reset() {
        now = Instant.now();
    }

    /**
     * Передвигает часы вперёд.
     *
     * @param duration на сколько передвинуть
     */
    public void advance(Duration duration) {
        now = now.plus(duration);
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return this;
    }

    @Override
    public Instant instant() {
        return now;
    }
}
