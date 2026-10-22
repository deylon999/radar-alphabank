package io.github.radar.service;

import io.github.radar.domain.Company;
import io.github.radar.domain.CompanyAccess;
import io.github.radar.exception.CompanyMembershipRequiredException;
import io.github.radar.exception.CompanyNotFoundException;
import io.github.radar.exception.CompanyOwnerRequiredException;
import io.github.radar.repository.CompanyRepository;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Проверка доступа к данным компании. ID компании из запроса не доказывает доступ:
 * членство читается из базы при каждой проверке, поэтому исключение и одобрение заявки
 * действуют со следующего запроса. Компания и роль читаются одним запросом.
 */
@Service
@RequiredArgsConstructor
public class CompanyAccessService {
    private final CompanyRepository companyRepository;

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
        CompanyAccess access = access(user, companyId);
        if (!access.isMember()) {
            throw new CompanyMembershipRequiredException();
        }
        return access.getCompany();
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
        CompanyAccess access = access(user, companyId);
        if (!access.isMember()) {
            throw new CompanyMembershipRequiredException();
        }
        if (!access.isOwner()) {
            throw new CompanyOwnerRequiredException();
        }
        return access.getCompany();
    }

    /**
     * Проверяет, владеет ли пользователь компанией, без исключений.
     *
     * @param user вошедший пользователь
     * @param companyId ID компании
     * @return true, если пользователь — владелец этой компании
     */
    public boolean isOwner(Principal user, String companyId) {
        return companyRepository.findAccess(companyId, UUID.fromString(user.getName()))
                .filter(CompanyAccess::isOwner)
                .isPresent();
    }

    private CompanyAccess access(Principal user, String companyId) {
        return companyRepository.findAccess(companyId, UUID.fromString(user.getName()))
                .orElseThrow(CompanyNotFoundException::new);
    }
}
