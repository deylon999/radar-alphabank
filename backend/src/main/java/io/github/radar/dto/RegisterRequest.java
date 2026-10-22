package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import io.github.radar.validation.NotCompromisedPassword;
import io.github.radar.validation.ValidationCode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Данные регистрации. Компания при регистрации не создаётся и не выбирается.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public class RegisterRequest {
    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Укажите email.", payload = ValidationCode.Required.class)
    @Size(min = 1, message = "Email не может быть пустым.",
            payload = ValidationCode.MustNotBeEmpty.class)
    @Size(max = 254, message = "Email должен быть не длиннее 254 символов.",
            payload = ValidationCode.OutOfRange.class)
    @Email(message = "Укажите корректный email.", payload = ValidationCode.InvalidFormat.class)
    private String email;

    @ToString.Exclude
    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Укажите пароль.", payload = ValidationCode.Required.class)
    @Size(min = 15, max = 255, message = "Пароль должен быть длиной от 15 до 255 символов.",
            payload = ValidationCode.OutOfRange.class)
    @NotCompromisedPassword(payload = ValidationCode.CompromisedPassword.class)
    private String password;
}
