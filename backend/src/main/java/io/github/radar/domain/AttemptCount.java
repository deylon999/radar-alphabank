package io.github.radar.domain;

import java.time.Duration;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Число попыток в текущем окне и время до его окончания.
 */
@Getter
@RequiredArgsConstructor
public class AttemptCount {
    private final long attempts;

    private final Duration remaining;
}
