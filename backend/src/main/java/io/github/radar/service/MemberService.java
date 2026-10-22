package io.github.radar.service;

import io.github.radar.dto.MemberResponse;
import io.github.radar.dto.MembersResponse;
import io.github.radar.exception.CompanyOwnerRequiredException;
import io.github.radar.exception.MemberNotFoundException;
import io.github.radar.exception.OwnerCannotLeaveException;
import io.github.radar.repository.MembershipRepository;
import jakarta.servlet.http.HttpSession;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Участники компании: список, исключение и выход.
 *
 * <p>Доступ исключённого пропадает со следующего запроса, потому что членство читается
 * из базы при каждой проверке. Аккаунт и сессии пользователя сохраняются.
 */
@Service
@RequiredArgsConstructor
public class MemberService {
    private final MembershipRepository membershipRepository;

    private final CompanyAccessService companyAccessService;

    private final ReauthenticationService reauthenticationService;

    /**
     * Возвращает участников компании любому её участнику.
     *
     * @param companyId ID компании
     * @param user вошедший пользователь
     * @return участники
     */
    public MembersResponse list(String companyId, Principal user) {
        companyAccessService.requireMember(user, companyId);
        return new MembersResponse(membershipRepository.findMembers(companyId).stream()
                .map(MemberResponse::new)
                .toList());
    }

    /**
     * Исключает участника или выходит из компании.
     *
     * <p>Исключать других может только владелец; проверка прав идёт раньше поиска участника,
     * поэтому участник не узнаёт состав компании через ответы 404. Удаляется только роль member:
     * если пользователь после удаления всё ещё в компании, это владелец.
     *
     * @param companyId ID компании
     * @param userId ID исключаемого пользователя или свой ID для выхода
     * @param user вошедший пользователь
     * @throws CompanyOwnerRequiredException если участник пытается исключить другого
     * @throws OwnerCannotLeaveException если владелец пытается выйти
     * @throws MemberNotFoundException если пользователь не состоит в компании
     */
    public void remove(String companyId, UUID userId, Principal user) {
        companyAccessService.requireMember(user, companyId);
        boolean leaving = userId.equals(UUID.fromString(user.getName()));
        if (!leaving && !companyAccessService.isOwner(user, companyId)) {
            throw new CompanyOwnerRequiredException();
        }
        if (membershipRepository.deleteMember(companyId, userId)) {
            return;
        }
        boolean stillInCompany = membershipRepository.findByUserId(userId)
                .filter(membership -> companyId.equals(membership.getCompanyId()))
                .isPresent();
        if (stillInCompany) {
            throw new OwnerCannotLeaveException();
        }
        throw new MemberNotFoundException();
    }

    /**
     * Передаёт права владельца участнику компании.
     *
     * <p>Нужно свежее подтверждение личности в текущей сессии. Роли меняются условными
     * обновлениями в одной транзакции: владелец в компании всегда ровно один, а повторный
     * или одновременный запрос бывшего владельца получает 403. Должности не меняются.
     *
     * @param companyId ID компании
     * @param userId ID будущего владельца
     * @param user вошедший пользователь
     * @param session текущая сессия
     * @throws CompanyOwnerRequiredException если пользователь не владелец
     * @throws io.github.radar.exception.ReauthenticationRequiredException если личность
     *         не подтверждена
     * @throws MemberNotFoundException если получатель не состоит в компании
     */
    @Transactional
    public void transferOwnership(String companyId, UUID userId, Principal user,
            HttpSession session) {
        companyAccessService.requireOwner(user, companyId);
        reauthenticationService.requireRecentConfirmation(session);
        UUID ownerId = UUID.fromString(user.getName());
        if (userId.equals(ownerId)) {
            return;
        }
        if (!membershipRepository.demoteOwner(companyId, ownerId)) {
            throw new CompanyOwnerRequiredException();
        }
        if (!membershipRepository.promoteMember(companyId, userId)) {
            throw new MemberNotFoundException();
        }
    }
}
