package io.github.radar.mapper;

import io.github.radar.domain.Company;
import io.github.radar.domain.JoinRequest;
import io.github.radar.dto.CompanySummaryResponse;
import io.github.radar.dto.JoinRequestApplicantResponse;
import io.github.radar.dto.JoinRequestResponse;
import org.springframework.stereotype.Component;

/**
 * Собирает ответ о заявке из заявки и компании.
 */
@Component
public class JoinRequestMapper {
    /**
     * Преобразует заявку в ответ.
     *
     * @param request заявка
     * @param company компания заявки
     * @return ответ о заявке
     */
    public JoinRequestResponse toResponse(JoinRequest request, Company company) {
        return new JoinRequestResponse(
                request.getId(),
                new CompanySummaryResponse(company),
                new JoinRequestApplicantResponse(request.getApplicantId(),
                        request.getApplicantEmail()),
                request.getStatus(),
                request.getPosition(),
                request.getMessage(),
                request.getCreatedAt(),
                request.getDecidedAt()
        );
    }
}
