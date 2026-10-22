package io.github.radar.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Locale;

/**
 * Происхождение компании: загружена из данных банка или создана пользователем.
 */
public enum CompanyOrigin {
    @JsonProperty("dataset")
    DATASET,

    @JsonProperty("user")
    USER;

    /**
     * Возвращает значение, в котором происхождение хранится в базе.
     *
     * @return значение в нижнем регистре
     */
    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }
}
