package io.github.radar.service;

import io.github.radar.domain.User;
import io.github.radar.dto.AuthenticatedLoginResponse;
import io.github.radar.dto.SecondFactorVerification;
import io.github.radar.exception.InvalidSecondFactorException;
import io.github.radar.exception.PendingLoginRequiredException;
import io.github.radar.repository.UserRepository;
import io.github.radar.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Второй шаг входа при включённой 2FA.
 */
@Service
@RequiredArgsConstructor
public class SecondFactorLoginService {
    private final LoginSessionService loginSessionService;

    private final SecondFactorService secondFactorService;

    private final UserRepository userRepository;

    /**
     * Завершает вход вторым фактором для ожидания из текущей сессии.
     *
     * <p>Неверный фактор ожидание не отменяет, истёкшее ожидание не продлевается:
     * нужно заново ввести email и пароль.
     *
     * @param verification TOTP-код или резервный код
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return завершённый вход
     * @throws PendingLoginRequiredException если ожидания нет или оно истекло
     * @throws InvalidSecondFactorException если второй фактор не принят
     * @throws io.github.radar.exception.TooManyAttemptsException если исчерпан лимит TOTP-кодов
     */
    public AuthenticatedLoginResponse verify(
            SecondFactorVerification verification,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        UUID userId = loginSessionService.pendingUser(httpRequest)
                .orElseThrow(PendingLoginRequiredException::new);
        if (!secondFactorService.verify(userId, verification)) {
            throw new InvalidSecondFactorException(userId);
        }
        User user = userRepository.findById(userId).orElseThrow();
        return loginSessionService.complete(new AuthenticatedUser(user.getId(), user.getEmail()),
                true, httpRequest, httpResponse);
    }
}
