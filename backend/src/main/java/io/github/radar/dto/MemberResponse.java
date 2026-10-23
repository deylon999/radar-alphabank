package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.github.radar.domain.Member;
import io.github.radar.domain.MembershipRole;
import io.github.radar.domain.Position;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;

/**
 * Участник компании.
 */
@Getter
public class MemberResponse {
    private final UUID userId;

    private final String email;

    private final MembershipRole role;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Position position;

    private final Instant joinedAt;

    /**
     * Создаёт ответ по участнику.
     *
     * @param member участник
     */
    public MemberResponse(Member member) {
        this.userId = member.getUserId();
        this.email = member.getEmail();
        this.role = member.getRole();
        this.position = member.getPosition();
        this.joinedAt = member.getJoinedAt();
    }
}
