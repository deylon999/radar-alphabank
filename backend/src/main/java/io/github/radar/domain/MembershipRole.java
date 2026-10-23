package io.github.radar.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Locale;

/**
 * Техническая роль доступа в компании. Владелец ровно один, он управляет участниками и заявками.
 */
public enum MembershipRole {
    @JsonProperty("owner")
    OWNER,

    @JsonProperty("member")
    MEMBER;

    /**
     * Возвращает значение, в котором роль хранится в базе.
     *
     * @return значение в нижнем регистре
     */
    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }
}
