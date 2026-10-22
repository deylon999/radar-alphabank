package io.github.radar.service;

import io.github.radar.config.RateLimitProperties;
import io.github.radar.domain.AttemptCount;
import io.github.radar.domain.Email;
import io.github.radar.exception.TooManyAttemptsException;
import io.github.radar.repository.AttemptCounterRepository;
import io.github.radar.security.Sha256Hasher;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Ограничения попыток входа, второго фактора и регистрации.
 *
 * <p>Попытка учитывается до проверки пароля: при исчерпанном лимите пароль не проверяется,
 * поэтому число дорогих проверок Argon2 ограничено и при параллельных запросах.
 * Email в ключе хранится как SHA-256, а не открытым текстом.
 */
@Service
@RequiredArgsConstructor
public class AttemptLimitService {
    private final AttemptCounterRepository attemptCounterRepository;

    private final RateLimitProperties rateLimit;

    private final Sha256Hasher sha256;

    /**
     * Учитывает попытку входа отдельно по email и по IP.
     *
     * @param email email из запроса, в том числе несуществующий
     * @param ip адрес клиента
     * @throws TooManyAttemptsException если исчерпан любой из лимитов
     */
    public void reserveLogin(Email email, String ip) {
        RateLimitProperties.Login login = rateLimit.login();
        AttemptCount byEmail =
                attemptCounterRepository.increment(loginEmailKey(email), login.window());
        AttemptCount byIp = attemptCounterRepository.increment(loginIpKey(ip), login.window());
        if (byEmail.getAttempts() > login.emailAttempts()) {
            throw new TooManyAttemptsException(byEmail.getRemaining());
        }
        if (byIp.getAttempts() > login.ipAttempts()) {
            throw new TooManyAttemptsException(byIp.getRemaining());
        }
    }

    /**
     * Снимает учтённую попытку после успешного входа: счётчик email сбрасывается,
     * а успешный вход не расходует лимит неудачных попыток с IP.
     *
     * @param email email пользователя
     * @param ip адрес клиента
     */
    public void forgiveLogin(Email email, String ip) {
        attemptCounterRepository.reset(loginEmailKey(email));
        attemptCounterRepository.decrement(loginIpKey(ip));
    }

    /**
     * Учитывает попытку регистрации с IP.
     *
     * @param ip адрес клиента
     * @throws TooManyAttemptsException если лимит исчерпан
     */
    public void reserveRegistration(String ip) {
        RateLimitProperties.Registration registration = rateLimit.registration();
        AttemptCount byIp = attemptCounterRepository.increment(
                "radar:attempts:registration:ip:" + ip, registration.window());
        if (byIp.getAttempts() > registration.ipAttempts()) {
            throw new TooManyAttemptsException(byIp.getRemaining());
        }
    }

    /**
     * Учитывает попытку TOTP-кода пользователя. Счётчик привязан к пользователю, а не к сессии:
     * новый вход по паролю его не сбрасывает.
     *
     * @param userId ID пользователя
     * @throws TooManyAttemptsException если лимит исчерпан
     */
    public void reserveSecondFactor(UUID userId) {
        RateLimitProperties.SecondFactor secondFactor = rateLimit.secondFactor();
        AttemptCount byUser = attemptCounterRepository.increment(
                secondFactorKey(userId), secondFactor.window());
        if (byUser.getAttempts() > secondFactor.userAttempts()) {
            throw new TooManyAttemptsException(byUser.getRemaining());
        }
    }

    /**
     * Сбрасывает счётчик TOTP-кодов пользователя после принятого кода.
     *
     * @param userId ID пользователя
     */
    public void forgiveSecondFactor(UUID userId) {
        attemptCounterRepository.reset(secondFactorKey(userId));
    }

    private String loginEmailKey(Email email) {
        return "radar:attempts:login:email:" + sha256.hex(email.getValue());
    }

    private String secondFactorKey(UUID userId) {
        return "radar:attempts:second-factor:user:" + userId;
    }

    private String loginIpKey(String ip) {
        return "radar:attempts:login:ip:" + ip;
    }
}
