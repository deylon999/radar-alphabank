package io.github.radar.dto;

import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Действующие входы пользователя. Анонимные и чужие сессии не включаются.
 */
@Getter
@RequiredArgsConstructor
public class SessionsResponse {
    private final List<SessionResponse> sessions;
}
