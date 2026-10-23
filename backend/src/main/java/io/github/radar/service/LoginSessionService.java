package io.github.radar.service;

import io.github.radar.config.SessionPolicyProperties;
import io.github.radar.domain.PendingLogin;
import io.github.radar.dto.AuthenticatedLoginResponse;
import io.github.radar.dto.AuthenticatedUserResponse;
import io.github.radar.dto.MfaRequiredResponse;
import io.github.radar.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

/**
 * Состояние входа в сессии: ожидание второго фактора и завершённый вход.
 *
 * <p>Ожидание второго фактора доступа не даёт: вход в сессии не сохраняется, только ID
 * пользователя и срок ожидания. Ожидание привязано к сессии, ID пользователя от клиента
 * не принимается. И переход в ожидание, и завершение входа меняют ID сессии и CSRF-токен.
 */
@Service
@RequiredArgsConstructor
public class LoginSessionService {
    private static final String PENDING_LOGIN = "radar.pendingLogin";

    private final UserSessionService userSessionService;

    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    private final SecurityContextRepository securityContextRepository;

    private final SessionPolicyProperties sessionPolicy;

    private final Clock clock;

    /**
     * Переводит сессию в ожидание второго фактора на заданный срок.
     *
     * @param userId ID пользователя с проверенным паролем
     * @param checked результат проверки пароля
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return срок ожидания
     */
    public MfaRequiredResponse awaitSecondFactor(
            UUID userId,
            Authentication checked,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        sessionAuthenticationStrategy.onAuthentication(checked, httpRequest, httpResponse);
        Instant expiresAt = clock.instant().plus(sessionPolicy.pendingLoginTimeout());
        httpRequest.getSession().setAttribute(PENDING_LOGIN, new PendingLogin(userId, expiresAt));
        return new MfaRequiredResponse("mfa_required", expiresAt);
    }

    /**
     * Возвращает пользователя, чей вход в текущей сессии ждёт второй фактор.
     *
     * @param httpRequest текущий запрос
     * @return ID пользователя или пустой результат, если ожидания нет или оно истекло
     */
    public Optional<UUID> pendingUser(HttpServletRequest httpRequest) {
        return Optional.ofNullable(
                        (PendingLogin) httpRequest.getSession().getAttribute(PENDING_LOGIN))
                .filter(pending -> clock.instant().isBefore(pending.getExpiresAt()))
                .map(PendingLogin::getUserId);
    }

    /**
     * Завершает вход в текущей сессии. 8-часовой предел отсчитывается от этого момента.
     *
     * @param user вошедший пользователь
     * @param twoFactorEnabled включена ли у пользователя 2FA
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return описание входа
     */
    public AuthenticatedLoginResponse complete(
            AuthenticatedUser user,
            boolean twoFactorEnabled,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        Authentication authentication =
                UsernamePasswordAuthenticationToken.authenticated(user, null, List.of());
        sessionAuthenticationStrategy.onAuthentication(authentication, httpRequest, httpResponse);
        httpRequest.getSession().removeAttribute(PENDING_LOGIN);
        securityContextRepository.saveContext(
                new SecurityContextImpl(authentication), httpRequest, httpResponse);
        Instant authenticatedAt = clock.instant();
        userSessionService.describeLogin(httpRequest, authenticatedAt);
        return new AuthenticatedLoginResponse(
                "authenticated",
                new AuthenticatedUserResponse(user.getId(), user.getEmail(), twoFactorEnabled),
                authenticatedAt,
                sessionPolicy.idleTimeout().toSeconds(),
                authenticatedAt.plus(sessionPolicy.absoluteTimeout())
        );
    }
}
