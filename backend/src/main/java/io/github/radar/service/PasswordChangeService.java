package io.github.radar.service;

import io.github.radar.dto.ChangePasswordRequest;
import io.github.radar.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.stereotype.Service;

/**
 * Смена пароля после повторного подтверждения личности.
 *
 * <p>Остальные сессии завершаются, у текущей меняются ID и CSRF-токен, подтверждение
 * личности сбрасывается. Время входа и его 8-часовой предел сохраняются. Запись пароля
 * в PostgreSQL и операции с сессиями в Redis не атомарны вместе.
 */
@Service
@RequiredArgsConstructor
public class PasswordChangeService {
    private final ReauthenticationService reauthenticationService;

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final UserSessionService userSessionService;

    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    /**
     * Меняет пароль текущего пользователя.
     *
     * @param request новый пароль
     * @param authentication вход текущей сессии
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @throws io.github.radar.exception.ReauthenticationRequiredException если личность
     *         не подтверждена
     */
    public void change(
            ChangePasswordRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        reauthenticationService.requireRecentConfirmation(httpRequest.getSession());
        userRepository.updatePasswordHash(UUID.fromString(authentication.getName()),
                passwordEncoder.encode(request.getNewPassword()));
        userSessionService.revokeOthers(authentication, httpRequest);
        sessionAuthenticationStrategy.onAuthentication(authentication, httpRequest, httpResponse);
        reauthenticationService.resetConfirmation(httpRequest.getSession());
    }
}
