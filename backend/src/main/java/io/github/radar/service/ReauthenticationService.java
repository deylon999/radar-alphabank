package io.github.radar.service;

import io.github.radar.config.SessionPolicyProperties;
import io.github.radar.domain.Email;
import io.github.radar.domain.User;
import io.github.radar.dto.ReauthenticateRequest;
import io.github.radar.dto.ReauthenticationResponse;
import io.github.radar.exception.InvalidReauthenticationException;
import io.github.radar.exception.ReauthenticationRequiredException;
import io.github.radar.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

/**
 * Повторное подтверждение личности для чувствительных действий.
 *
 * <p>Подтверждение хранится в текущей сессии и действует заданный срок от момента проверки:
 * обычные запросы его не продлевают, в других сессиях оно не действует. Неверный пароль
 * расходует тот же лимит попыток, что и вход, иначе через подтверждение можно было бы
 * перебирать пароль в обход лимита входа.
 */
@Service
@RequiredArgsConstructor
public class ReauthenticationService {
    private static final String CONFIRMED_AT = "radar.reauthenticatedAt";

    private final AuthenticationManager authenticationManager;

    private final AttemptLimitService attemptLimitService;

    private final UserRepository userRepository;

    private final UserSessionService userSessionService;

    private final SessionPolicyProperties sessionPolicy;

    private final Clock clock;

    /**
     * Проверяет текущий пароль и подтверждает личность в текущей сессии.
     *
     * @param request текущий пароль
     * @param principal вошедший пользователь
     * @param httpRequest текущий запрос
     * @return время подтверждения и время, до которого оно действует
     * @throws InvalidReauthenticationException если пароль неверен
     */
    public ReauthenticationResponse reauthenticate(
            ReauthenticateRequest request,
            Principal principal,
            HttpServletRequest httpRequest
    ) {
        User user = userRepository.findById(UUID.fromString(principal.getName())).orElseThrow();
        Email email = new Email(user.getEmail());
        String ip = httpRequest.getRemoteAddr();
        attemptLimitService.reserveLogin(email, ip);
        try {
            authenticationManager.authenticate(UsernamePasswordAuthenticationToken
                    .unauthenticated(email.getValue(), request.getPassword()));
        } catch (BadCredentialsException exception) {
            throw new InvalidReauthenticationException(exception);
        }
        attemptLimitService.forgiveLogin(email, ip);
        HttpSession session = httpRequest.getSession();
        Instant confirmedAt = clock.instant();
        session.setAttribute(CONFIRMED_AT, confirmedAt);
        Instant confirmationEnd = confirmedAt.plus(sessionPolicy.reauthenticationTimeout());
        Instant sessionEnd = userSessionService.authenticatedAt(session)
                .plus(sessionPolicy.absoluteTimeout());
        return new ReauthenticationResponse(confirmedAt,
                confirmationEnd.isBefore(sessionEnd) ? confirmationEnd : sessionEnd);
    }

    /**
     * Проверяет, что личность подтверждена в текущей сессии не раньше заданного срока.
     *
     * @param session текущая сессия
     * @throws ReauthenticationRequiredException если подтверждения нет или оно истекло
     */
    public void requireRecentConfirmation(HttpSession session) {
        Instant confirmedAt = (Instant) session.getAttribute(CONFIRMED_AT);
        if (confirmedAt == null || !clock.instant()
                .isBefore(confirmedAt.plus(sessionPolicy.reauthenticationTimeout()))) {
            throw new ReauthenticationRequiredException();
        }
    }

    /**
     * Сбрасывает подтверждение личности в текущей сессии.
     *
     * @param session текущая сессия
     */
    public void resetConfirmation(HttpSession session) {
        session.removeAttribute(CONFIRMED_AT);
    }
}
