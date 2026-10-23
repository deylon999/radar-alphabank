package io.github.radar.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.github.radar.domain.Company;
import io.github.radar.domain.CompanyOrigin;
import lombok.Getter;

/**
 * Публичная карточка компании без профиля, признаков и аналитики.
 */
@Getter
public class CompanySummaryResponse {
    private final String id;

    private final String name;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final String inn;

    private final CompanyOrigin origin;

    /**
     * Создаёт карточку компании.
     *
     * @param company компания
     */
    public CompanySummaryResponse(Company company) {
        this.id = company.getId();
        this.name = company.getName();
        this.inn = company.getInn();
        this.origin = company.getOrigin();
    }
}
