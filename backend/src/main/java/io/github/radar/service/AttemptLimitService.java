package io.github.radar.service;

import io.github.radar.config.RateLimitProperties;
import io.github.radar.domain.AttemptCount;
import io.github.radar.domain.Email;
import io.github.radar.exception.TooManyAttemptsException;
import io.github.radar.repository.AttemptCounterRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Ограничения попыток входа и регистрации.
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

    private String loginEmailKey(Email email) {
        return "radar:attempts:login:email:" + sha256(email.getValue());
    }

    private String loginIpKey(String ip) {
        return "radar:attempts:login:ip:" + ip;
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 недоступен", exception);
        }
    }
}
