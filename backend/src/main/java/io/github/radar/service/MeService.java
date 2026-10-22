package io.github.radar.service;

import io.github.radar.domain.JoinRequestStatus;
import io.github.radar.domain.Membership;
import io.github.radar.domain.User;
import io.github.radar.dto.AuthenticatedUserResponse;
import io.github.radar.dto.CompanySummaryResponse;
import io.github.radar.dto.JoinRequestResponse;
import io.github.radar.dto.MeResponse;
import io.github.radar.dto.MembershipResponse;
import io.github.radar.dto.UpdateMembershipRequest;
import io.github.radar.exception.MembershipNotFoundException;
import io.github.radar.mapper.JoinRequestMapper;
import io.github.radar.repository.CompanyRepository;
import io.github.radar.repository.JoinRequestRepository;
import io.github.radar.repository.MembershipRepository;
import io.github.radar.repository.UserRepository;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Текущий пользователь и его отношение к компании.
 *
 * <p>Членство читается из базы при каждом запросе: одобрение заявки, исключение
 * и передача прав видны без повторного входа.
 */
@Service
@RequiredArgsConstructor
public class MeService {
    private final UserRepository userRepository;

    private final MembershipRepository membershipRepository;

    private final CompanyRepository companyRepository;

    private final JoinRequestRepository joinRequestRepository;

    private final JoinRequestMapper joinRequestMapper;

    private final SecondFactorService secondFactorService;

    /**
     * Описывает текущего пользователя.
     *
     * @param principal вошедший пользователь
     * @return пользователь, членство, заявка и право на метрики качества
     */
    public MeResponse describe(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        User user = userRepository.findById(userId).orElseThrow();
        MembershipResponse membership = membershipRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElse(null);
        return new MeResponse(
                new AuthenticatedUserResponse(user.getId(), user.getEmail(),
                        secondFactorService.isEnabled(userId)),
                membership,
                membership == null ? visibleJoinRequest(userId) : null,
                user.isCanViewQualityMetrics()
        );
    }

    private JoinRequestResponse visibleJoinRequest(UUID userId) {
        return joinRequestRepository.findLatestByApplicant(userId)
                .filter(request -> request.getStatus() == JoinRequestStatus.PENDING
                        || request.getStatus() == JoinRequestStatus.REJECTED)
                .map(request -> joinRequestMapper.toResponse(request,
                        companyRepository.findById(request.getCompanyId()).orElseThrow()))
                .orElse(null);
    }

    /**
     * Меняет свою должность. Должность влияет только на порядок ленты и прав не даёт.
     *
     * @param request новая должность
     * @param principal вошедший пользователь
     * @return членство с новой должностью
     * @throws MembershipNotFoundException если пользователь не состоит в компании
     */
    public MembershipResponse updateMembership(
            UpdateMembershipRequest request,
            Principal principal
    ) {
        UUID userId = UUID.fromString(principal.getName());
        if (!membershipRepository.updatePosition(userId, request.getPosition())) {
            throw new MembershipNotFoundException();
        }
        return toResponse(membershipRepository.findByUserId(userId).orElseThrow());
    }

    private MembershipResponse toResponse(Membership membership) {
        return new MembershipResponse(
                new CompanySummaryResponse(
                        companyRepository.findById(membership.getCompanyId()).orElseThrow()),
                membership.getRole(),
                membership.getPosition(),
                membership.getJoinedAt());
    }
}
