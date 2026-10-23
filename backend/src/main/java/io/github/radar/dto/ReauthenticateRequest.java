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
 * Повторное подтверждение личности текущим паролем, а при включённой 2FA — ещё и вторым
 * фактором.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public class ReauthenticateRequest {
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
    private SecondFactorVerification secondFactor;
}
