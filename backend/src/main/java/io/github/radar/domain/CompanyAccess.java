package io.github.radar.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Компания и роль в ней пользователя, прочитанные одним запросом при проверке доступа.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class CompanyAccess {
    private final Company company;

    private final MembershipRole role;

    /**
     * Проверяет, состоит ли пользователь в компании.
     *
     * @return true, если у пользователя есть роль в компании
     */
    public boolean isMember() {
        return role != null;
    }

    /**
     * Проверяет, владеет ли пользователь компанией.
     *
     * @return true, если пользователь — владелец
     */
    public boolean isOwner() {
        return role == MembershipRole.OWNER;
    }
}
