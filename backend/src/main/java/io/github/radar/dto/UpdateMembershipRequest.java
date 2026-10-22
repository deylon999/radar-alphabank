package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import io.github.radar.domain.Position;
import io.github.radar.validation.ValidationCode;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Изменение своего членства. Роль доступа здесь не меняется.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
public class UpdateMembershipRequest {
    @JsonSetter(nulls = Nulls.FAIL)
    @NotNull(message = "Выберите должность.", payload = ValidationCode.Required.class)
    private Position position;
}
