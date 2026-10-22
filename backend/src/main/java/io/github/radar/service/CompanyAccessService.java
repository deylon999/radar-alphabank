package io.github.radar.service;

import io.github.radar.domain.Company;
import io.github.radar.domain.Membership;
import io.github.radar.domain.MembershipRole;
import io.github.radar.exception.CompanyMembershipRequiredException;
import io.github.radar.exception.CompanyNotFoundException;
import io.github.radar.exception.CompanyOwnerRequiredException;
import io.github.radar.repository.CompanyRepository;
import io.github.radar.repository.MembershipRepository;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Проверка доступа к данным компании. ID компании из запроса не доказывает доступ:
 * членство читается из базы при каждой проверке, поэтому исключение и одобрение заявки
 * действуют со следующего запроса.
 */
@Service
@RequiredArgsConstructor
public class CompanyAccessService {
    private final CompanyRepository companyRepository;

    private final MembershipRepository membershipRepository;

    /**
     * Проверяет, что пользователь состоит в компании.
     *
     * @param user вошедший пользователь
     * @param companyId ID компании из запроса
     * @return компания
     * @throws CompanyNotFoundException если компании нет
     * @throws CompanyMembershipRequiredException если пользователь в ней не состоит
     */
    public Company requireMember(Principal user, String companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(CompanyNotFoundException::new);
        membershipIn(user, companyId);
        return company;
    }

    /**
     * Проверяет, что пользователь — владелец компании.
     *
     * @param user вошедший пользователь
     * @param companyId ID компании из запроса
     * @return компания
     * @throws CompanyNotFoundException если компании нет
     * @throws CompanyMembershipRequiredException если пользователь в ней не состоит
     * @throws CompanyOwnerRequiredException если пользователь не владелец
     */
    public Company requireOwner(Principal user, String companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(CompanyNotFoundException::new);
        if (membershipIn(user, companyId).getRole() != MembershipRole.OWNER) {
            throw new CompanyOwnerRequiredException();
        }
        return company;
    }

    /**
     * Проверяет, владеет ли пользователь компанией, без исключений.
     *
     * @param user вошедший пользователь
     * @param companyId ID компании
     * @return true, если пользователь — владелец этой компании
     */
    public boolean isOwner(Principal user, String companyId) {
        return membershipRepository.findByUserId(UUID.fromString(user.getName()))
                .filter(membership -> companyId.equals(membership.getCompanyId()))
                .filter(membership -> membership.getRole() == MembershipRole.OWNER)
                .isPresent();
    }

    private Membership membershipIn(Principal user, String companyId) {
        return membershipRepository.findByUserId(UUID.fromString(user.getName()))
                .filter(membership -> companyId.equals(membership.getCompanyId()))
                .orElseThrow(CompanyMembershipRequiredException::new);
    }
}
