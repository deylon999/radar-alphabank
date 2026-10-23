package io.github.radar.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.stereotype.Service;

/**
 * Обновление сессий после смены способа входа: пароля или второго фактора.
 *
 * <p>Остальные сессии пользователя завершаются, у текущей меняются ID и CSRF-токен,
 * подтверждение личности сбрасывается. Время входа и его 8-часовой предел сохраняются.
 */
@Service
@RequiredArgsConstructor
public class SessionRenewalService {
    private final UserSessionService userSessionService;

    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    private final ReauthenticationService reauthenticationService;

    /**
     * Обновляет сессии после смены способа входа.
     *
     * @param authentication вход текущей сессии
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     */
    public void renewAfterCredentialChange(
            Authentication authentication,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        userSessionService.revokeOthers(authentication, httpRequest);
        sessionAuthenticationStrategy.onAuthentication(authentication, httpRequest, httpResponse);
        reauthenticationService.resetConfirmation(httpRequest.getSession());
    }
}
