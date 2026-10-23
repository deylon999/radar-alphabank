package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import io.github.radar.validation.NotCompromisedPassword;
import io.github.radar.validation.ValidationCode;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Новый пароль после повторного подтверждения личности.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public class ChangePasswordRequest {
    @ToString.Exclude
    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Укажите новый пароль.", payload = ValidationCode.Required.class)
    @Size(min = 15, max = 255, message = "Новый пароль должен быть длиной от 15 до 255 символов.",
            payload = ValidationCode.OutOfRange.class)
    @NotCompromisedPassword(payload = ValidationCode.CompromisedPassword.class)
    private String newPassword;
}
