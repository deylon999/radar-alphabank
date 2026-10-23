package io.github.radar.dto;

import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Заявки, ожидающие решения, начиная с самой старой.
 */
@Getter
@RequiredArgsConstructor
public class JoinRequestsResponse {
    private final List<JoinRequestResponse> joinRequests;
}
