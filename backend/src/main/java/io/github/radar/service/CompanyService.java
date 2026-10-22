package io.github.radar.service;

import io.github.radar.domain.AnalysisStatus;
import io.github.radar.domain.Company;
import io.github.radar.domain.Membership;
import io.github.radar.domain.MembershipRole;
import io.github.radar.dto.CompanyAnalysisResponse;
import io.github.radar.dto.CompanyResponse;
import io.github.radar.dto.CompanySummaryResponse;
import io.github.radar.dto.CreateCompanyRequest;
import io.github.radar.exception.AlreadyCompanyMemberException;
import io.github.radar.exception.JoinRequestPendingException;
import io.github.radar.repository.CompanyRepository;
import io.github.radar.repository.JoinRequestRepository;
import io.github.radar.repository.MembershipRepository;
import java.security.Principal;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Создание компании пользователем и профиль компании для её участников.
 */
@Service
@RequiredArgsConstructor
public class CompanyService {
    private final CompanyRepository companyRepository;

    private final MembershipRepository membershipRepository;

    private final CompanyAccessService companyAccessService;

    private final JoinRequestRepository joinRequestRepository;

    private final Clock clock;

    /**
     * Создаёт компанию и делает создателя владельцем в одной транзакции.
     *
     * <p>Одно членство на пользователя обеспечивает только схема, без предварительной проверки:
     * и повторный, и одновременный запрос получают 409, а их компания откатывается
     * вместе с транзакцией.
     *
     * @param request наименование, ИНН и должность создателя
     * @param user вошедший пользователь
     * @return карточка созданной компании
     * @throws AlreadyCompanyMemberException если пользователь уже состоит в компании
     * @throws JoinRequestPendingException если у пользователя есть заявка, ожидающая решения
     */
    @Transactional
    public CompanySummaryResponse create(CreateCompanyRequest request, Principal user) {
        UUID userId = UUID.fromString(user.getName());
        if (joinRequestRepository.hasPending(userId)) {
            throw new JoinRequestPendingException();
        }
        Company company = companyRepository.insertUserCompany(request.getName(), request.getInn());
        try {
            membershipRepository.insert(new Membership(userId, company.getId(),
                    MembershipRole.OWNER, request.getPosition(), clock.instant()));
        } catch (DuplicateKeyException exception) {
            throw new AlreadyCompanyMemberException(exception);
        }
        return new CompanySummaryResponse(company);
    }

    /**
     * Возвращает профиль компании её участнику.
     *
     * <p>Сведения пользователей и данные банка появятся вместе со своими функциями;
     * компания без подтверждённых сведений находится в состоянии needs_context.
     *
     * @param companyId ID компании
     * @param user вошедший пользователь
     * @return профиль компании
     */
    public CompanyResponse profile(String companyId, Principal user) {
        Company company = companyAccessService.requireMember(user, companyId);
        return new CompanyResponse(
                new CompanySummaryResponse(company),
                "",
                List.of(),
                new CompanyAnalysisResponse(AnalysisStatus.NEEDS_CONTEXT)
        );
    }
}
