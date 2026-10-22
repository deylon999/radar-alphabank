package io.github.radar.dto;

import io.github.radar.domain.Position;
import io.github.radar.validation.ValidationCode;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Заявка на вступление. Заявителя и компанию определяет сервер по сессии и пути.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public class SubmitJoinRequest {
    private Position position;

    @ToString.Exclude
    @Size(min = 1, message = "Сообщение не может быть пустым.",
            payload = ValidationCode.MustNotBeEmpty.class)
    @Size(max = 500, message = "Сообщение должно быть не длиннее 500 символов.",
            payload = ValidationCode.OutOfRange.class)
    private String message;
}
