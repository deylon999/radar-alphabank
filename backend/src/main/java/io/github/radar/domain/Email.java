package io.github.radar.domain;

import java.util.Locale;
import lombok.Getter;
import lombok.ToString;

/**
 * Email пользователя в нормализованном виде: по нему регистрируют, входят и считают попытки.
 */
@Getter
@ToString
public class Email {
    private final String value;

    /**
     * Создаёт email из значения, введённого пользователем.
     *
     * @param value email из запроса
     */
    public Email(String value) {
        this.value = normalized(value);
    }

    private String normalized(String value) {
        return value.toLowerCase(Locale.ROOT);
    }
}
