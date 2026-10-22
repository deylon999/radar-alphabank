package io.github.radar.service;

import io.github.radar.config.SessionPolicyProperties;
import io.github.radar.domain.Email;
import io.github.radar.dto.AuthenticatedUserResponse;
import io.github.radar.dto.LoginRequest;
import io.github.radar.dto.LoginResponse;
import io.github.radar.exception.AlreadyAuthenticatedException;
import io.github.radar.exception.InvalidCredentialsException;
import io.github.radar.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

/**
 * Вход по email и паролю без второго фактора.
 */
@Service
@RequiredArgsConstructor
public class LoginService {
    private final AuthenticationManager authenticationManager;

    private final AttemptLimitService attemptLimitService;

    private final UserSessionService userSessionService;

    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    private final SecurityContextRepository securityContextRepository;

    private final SessionPolicyProperties sessionPolicy;

    private final Clock clock;

    /**
     * Проверяет учётные данные и завершает вход в текущей сессии.
     *
     * <p>ID сессии и CSRF-токен меняются: cookie и токен, выданные до входа, больше
     * не действуют.
     *
     * @param request email и пароль
     * @param currentUser пользователь сессии или null, если вход не выполнен
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return описание входа
     * @throws AlreadyAuthenticatedException если вход уже выполнен
     * @throws InvalidCredentialsException если email или пароль неверны
     * @throws io.github.radar.exception.TooManyAttemptsException если исчерпан лимит попыток
     */
    public LoginResponse login(
            LoginRequest request,
            Principal currentUser,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        if (currentUser != null) {
            throw new AlreadyAuthenticatedException();
        }
        Email email = new Email(request.getEmail());
        String ip = httpRequest.getRemoteAddr();
        attemptLimitService.reserveLogin(email, ip);
        Authentication checked = checkCredentials(email, request.getPassword());
        attemptLimitService.forgiveLogin(email, ip);
        AuthenticatedUser user =
                new AuthenticatedUser(UUID.fromString(checked.getName()), email.getValue());
        Authentication authentication =
                UsernamePasswordAuthenticationToken.authenticated(user, null, List.of());

        sessionAuthenticationStrategy.onAuthentication(authentication, httpRequest, httpResponse);
        securityContextRepository.saveContext(
                new SecurityContextImpl(authentication), httpRequest, httpResponse);
        Instant authenticatedAt = clock.instant();
        userSessionService.describeLogin(httpRequest, authenticatedAt);

        return new LoginResponse(
                "authenticated",
                new AuthenticatedUserResponse(user.getId(), user.getEmail(), false),
                authenticatedAt,
                sessionPolicy.idleTimeout().toSeconds(),
                authenticatedAt.plus(sessionPolicy.absoluteTimeout())
        );
    }

    private Authentication checkCredentials(Email email, String password) {
        try {
            return authenticationManager.authenticate(UsernamePasswordAuthenticationToken
                    .unauthenticated(email.getValue(), password));
        } catch (BadCredentialsException exception) {
            throw new InvalidCredentialsException(exception);
        }
    }
}
