package io.github.radar.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Locale;

/**
 * Должность пользователя для персонализации аналитики. Прав доступа не даёт.
 * OWNER — собственник бизнеса, а не роль владельца в «Радаре».
 */
public enum Position {
    @JsonProperty("owner")
    OWNER,

    @JsonProperty("ceo")
    CEO,

    @JsonProperty("cfo")
    CFO,

    @JsonProperty("accountant")
    ACCOUNTANT,

    @JsonProperty("treasurer")
    TREASURER,

    @JsonProperty("other")
    OTHER;

    /**
     * Возвращает значение, в котором должность хранится в базе.
     *
     * @return значение в нижнем регистре
     */
    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }
}
