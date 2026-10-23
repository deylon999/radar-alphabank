package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import io.github.radar.domain.Position;
import io.github.radar.validation.ValidInn;
import io.github.radar.validation.ValidationCode;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Сведения для создания компании. ID компании и роль создателя назначает сервер.
 * Наименование и ИНН не проверяются по реестру и не становятся данными банка.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public class CreateCompanyRequest {
    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Укажите наименование.", payload = ValidationCode.Required.class)
    @Size(min = 1, message = "Наименование не может быть пустым.",
            payload = ValidationCode.MustNotBeEmpty.class)
    @Size(max = 500, message = "Наименование должно быть не длиннее 500 символов.",
            payload = ValidationCode.OutOfRange.class)
    private String name;

    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Укажите ИНН.", payload = ValidationCode.Required.class)
    @Pattern(regexp = "[0-9]{10}|[0-9]{12}", message = "ИНН состоит из 10 или 12 цифр.",
            payload = ValidationCode.MustMatchPattern.class)
    @ValidInn(payload = ValidationCode.InvalidChecksum.class)
    private String inn;

    private Position position;
}
