package io.github.radar.service;

import io.github.radar.domain.Company;
import io.github.radar.domain.JoinRequest;
import io.github.radar.domain.JoinRequestStatus;
import io.github.radar.domain.Membership;
import io.github.radar.domain.MembershipRole;
import io.github.radar.dto.JoinRequestResponse;
import io.github.radar.dto.JoinRequestsResponse;
import io.github.radar.dto.SubmitJoinRequest;
import io.github.radar.exception.AlreadyCompanyMemberException;
import io.github.radar.exception.CompanyNotFoundException;
import io.github.radar.exception.JoinRequestApplicantRequiredException;
import io.github.radar.exception.JoinRequestNotFoundException;
import io.github.radar.exception.JoinRequestNotPendingException;
import io.github.radar.exception.JoinRequestPendingException;
import io.github.radar.mapper.JoinRequestMapper;
import io.github.radar.repository.CompanyRepository;
import io.github.radar.repository.JoinRequestRepository;
import io.github.radar.repository.MembershipRepository;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Заявки на вступление: подача, решение владельца и отмена заявителем.
 *
 * <p>Пока заявка ждёт решения, она не даёт доступа к компании. Одобрение в одной транзакции
 * меняет статус и делает заявителя участником.
 */
@Service
@RequiredArgsConstructor
public class JoinRequestService {
    private final JoinRequestRepository joinRequestRepository;

    private final CompanyRepository companyRepository;

    private final MembershipRepository membershipRepository;

    private final CompanyAccessService companyAccessService;

    private final JoinRequestMapper joinRequestMapper;

    private final Clock clock;

    /**
     * Подаёт заявку на вступление.
     *
     * @param companyId ID компании
     * @param request должность и сообщение
     * @param user вошедший пользователь
     * @return созданная заявка
     * @throws CompanyNotFoundException если компании нет
     * @throws AlreadyCompanyMemberException если пользователь уже состоит в компании
     * @throws JoinRequestPendingException если у пользователя есть ожидающая заявка
     */
    public JoinRequestResponse submit(String companyId, SubmitJoinRequest request, Principal user) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(CompanyNotFoundException::new);
        UUID applicantId = UUID.fromString(user.getName());
        if (membershipRepository.findByUserId(applicantId).isPresent()) {
            throw new AlreadyCompanyMemberException();
        }
        try {
            JoinRequest created = joinRequestRepository.insertPending(companyId, applicantId,
                    request.getPosition(), request.getMessage(), clock.instant());
            return joinRequestMapper.toResponse(created, company);
        } catch (DuplicateKeyException exception) {
            throw new JoinRequestPendingException(exception);
        }
    }

    /**
     * Возвращает владельцу ожидающие заявки его компании.
     *
     * @param companyId ID компании
     * @param user вошедший пользователь
     * @return ожидающие заявки
     */
    public JoinRequestsResponse listPending(String companyId, Principal user) {
        Company company = companyAccessService.requireOwner(user, companyId);
        return new JoinRequestsResponse(joinRequestRepository.findPendingByCompany(companyId)
                .stream()
                .map(request -> joinRequestMapper.toResponse(request, company))
                .toList());
    }

    /**
     * Одобряет заявку: заявитель становится участником с должностью из заявки.
     *
     * @param companyId ID компании
     * @param requestId ID заявки
     * @param user вошедший пользователь
     * @return одобренная заявка
     */
    @Transactional
    public JoinRequestResponse approve(String companyId, UUID requestId, Principal user) {
        Company company = companyAccessService.requireOwner(user, companyId);
        Instant now = clock.instant();
        decideByOwner(companyId, requestId, JoinRequestStatus.APPROVED, now);
        JoinRequest approved = joinRequestRepository.findById(requestId).orElseThrow();
        try {
            membershipRepository.insert(new Membership(approved.getApplicantId(), companyId,
                    MembershipRole.MEMBER, approved.getPosition(), now));
        } catch (DuplicateKeyException exception) {
            throw new AlreadyCompanyMemberException(exception);
        }
        return joinRequestMapper.toResponse(approved, company);
    }

    /**
     * Отклоняет заявку. Заявитель может подать новую.
     *
     * @param companyId ID компании
     * @param requestId ID заявки
     * @param user вошедший пользователь
     * @return отклонённая заявка
     */
    public JoinRequestResponse reject(String companyId, UUID requestId, Principal user) {
        Company company = companyAccessService.requireOwner(user, companyId);
        decideByOwner(companyId, requestId, JoinRequestStatus.REJECTED, clock.instant());
        return joinRequestMapper.toResponse(joinRequestRepository.findById(requestId).orElseThrow(),
                company);
    }

    /**
     * Отменяет свою заявку. Владелец получает 403, остальные — 404.
     *
     * @param companyId ID компании
     * @param requestId ID заявки
     * @param user вошедший пользователь
     * @return отменённая заявка
     */
    public JoinRequestResponse cancel(String companyId, UUID requestId, Principal user) {
        JoinRequest request = requestOf(companyId, requestId);
        UUID userId = UUID.fromString(user.getName());
        if (!request.getApplicantId().equals(userId)) {
            if (companyAccessService.isOwner(user, companyId)) {
                throw new JoinRequestApplicantRequiredException();
            }
            throw new JoinRequestNotFoundException();
        }
        if (!joinRequestRepository.cancelByApplicant(requestId, userId, clock.instant())) {
            throw new JoinRequestNotPendingException();
        }
        return joinRequestMapper.toResponse(joinRequestRepository.findById(requestId).orElseThrow(),
                companyRepository.findById(companyId).orElseThrow());
    }

    private void decideByOwner(String companyId, UUID requestId, JoinRequestStatus status,
            Instant decidedAt) {
        if (!joinRequestRepository.decideByOwner(requestId, companyId, status, decidedAt)) {
            requestOf(companyId, requestId);
            throw new JoinRequestNotPendingException();
        }
    }

    private JoinRequest requestOf(String companyId, UUID requestId) {
        return joinRequestRepository.findById(requestId)
                .filter(request -> companyId.equals(request.getCompanyId()))
                .orElseThrow(JoinRequestNotFoundException::new);
    }
}
