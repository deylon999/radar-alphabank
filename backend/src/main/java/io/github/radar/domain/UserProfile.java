package io.github.radar.domain;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Пользователь с членством в компании и признаком 2FA, прочитанные одним запросом.
 */
@RequiredArgsConstructor
@ToString
public class UserProfile {
    private final User user;

    private final CompanyMembership membership;

    private final boolean twoFactorEnabled;

    /**
     * Возвращает пользователя.
     *
     * @return пользователь
     */
    public User getUser() {
        return user;
    }

    /**
     * Возвращает членство в компании.
     *
     * @return членство с компанией или пустой результат, если пользователь без компании
     */
    public Optional<CompanyMembership> getMembership() {
        return Optional.ofNullable(membership);
    }

    /**
     * Сообщает, включена ли у пользователя 2FA.
     *
     * @return true, если включена
     */
    public boolean isTwoFactorEnabled() {
        return twoFactorEnabled;
    }
}
