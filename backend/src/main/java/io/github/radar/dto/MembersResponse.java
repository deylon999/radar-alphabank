package io.github.radar.dto;

import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Участники компании: первым владелец, остальные по времени вступления.
 */
@Getter
@RequiredArgsConstructor
public class MembersResponse {
    private final List<MemberResponse> members;
}
