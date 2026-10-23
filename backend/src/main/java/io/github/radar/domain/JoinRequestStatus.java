package io.github.radar.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Locale;

/**
 * Состояние заявки. Меняется только одобрением, отклонением и отменой; решённую заявку
 * изменить нельзя.
 */
public enum JoinRequestStatus {
    @JsonProperty("pending")
    PENDING,

    @JsonProperty("approved")
    APPROVED,

    @JsonProperty("rejected")
    REJECTED,

    @JsonProperty("cancelled")
    CANCELLED;

    /**
     * Возвращает значение, в котором состояние хранится в базе.
     *
     * @return значение в нижнем регистре
     */
    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }
}
