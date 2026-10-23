package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import io.github.radar.validation.ValidationCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Пароль и второй фактор прямо в запросе: для отключения 2FA и перевыпуска резервных кодов
 * недавнего подтверждения личности недостаточно.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public class SensitiveActionRequest {
    @ToString.Exclude
    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Нужно указать текущий пароль.", payload = ValidationCode.Required.class)
    @Size(min = 1, message = "Пароль не может быть пустым.",
            payload = ValidationCode.MustNotBeEmpty.class)
    @Size(max = 255, message = "Пароль должен быть не длиннее 255 символов.",
            payload = ValidationCode.OutOfRange.class)
    private String password;

    @Valid
    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Укажите второй фактор.", payload = ValidationCode.Required.class)
    private SecondFactorVerification secondFactor;
}
