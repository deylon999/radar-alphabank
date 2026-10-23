package io.github.radar.dto;

import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Заявитель. Подавая заявку, он показывает свой email владельцу компании.
 */
@Getter
@RequiredArgsConstructor
public class JoinRequestApplicantResponse {
    private final UUID id;

    private final String email;
}
