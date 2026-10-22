package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import io.github.radar.validation.ValidationCode;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Второй фактор одноразовым резервным кодом. Код погашается после успешной проверки.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public final class RecoveryCodeVerification implements SecondFactorVerification {
    @ToString.Exclude
    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Укажите резервный код.", payload = ValidationCode.Required.class)
    @Pattern(regexp = "[0-9a-f]{8}(-[0-9a-f]{8}){3}",
            message = "Резервный код состоит из четырёх групп по восемь символов 0–9 и a–f.",
            payload = ValidationCode.MustMatchPattern.class)
    private String code;
}
