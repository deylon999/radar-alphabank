package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Подтверждение вторым фактором: TOTP-кодом или одноразовым резервным кодом.
 * Вариант выбирается полем method.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "method")
@JsonSubTypes({
    @JsonSubTypes.Type(value = TotpVerification.class, name = "totp"),
    @JsonSubTypes.Type(value = RecoveryCodeVerification.class, name = "recovery_code")
})
public sealed interface SecondFactorVerification
        permits TotpVerification, RecoveryCodeVerification {
}
