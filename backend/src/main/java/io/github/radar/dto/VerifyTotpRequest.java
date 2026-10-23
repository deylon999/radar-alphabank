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
 * Первый код для секрета, полученного при настройке TOTP.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public class VerifyTotpRequest {
    @ToString.Exclude
    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Укажите TOTP-код.", payload = ValidationCode.Required.class)
    @Pattern(regexp = "[0-9]{6}", message = "TOTP-код должен состоять ровно из шести цифр.",
            payload = ValidationCode.MustMatchPattern.class)
    private String code;
}
