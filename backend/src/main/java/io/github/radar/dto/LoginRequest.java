package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import io.github.radar.validation.ValidationCode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Данные входа. Членство в компании сервер определяет сам и при входе не принимает.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public class LoginRequest {
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
    @Size(min = 1, message = "Пароль не может быть пустым.",
            payload = ValidationCode.MustNotBeEmpty.class)
    @Size(max = 255, message = "Пароль должен быть не длиннее 255 символов.",
            payload = ValidationCode.OutOfRange.class)
    private String password;
}
