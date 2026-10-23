package io.github.radar.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * CSRF-токен текущей сессии и заголовок, в котором его передают изменяющие запросы.
 */
@Getter
@RequiredArgsConstructor
public class CsrfResponse {
    private final String token;

    private final String headerName;
}
