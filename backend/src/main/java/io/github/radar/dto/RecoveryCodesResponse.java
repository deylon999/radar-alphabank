package io.github.radar.dto;

import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Новый набор резервных кодов. На сервере остаются только их хеши.
 */
@Getter
@RequiredArgsConstructor
public class RecoveryCodesResponse {
    private final List<String> recoveryCodes;
}
