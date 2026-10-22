package io.github.radar.service;

import io.github.radar.config.SessionPolicyProperties;
import io.github.radar.domain.Email;
import io.github.radar.domain.User;
import io.github.radar.dto.ReauthenticateRequest;
import io.github.radar.dto.ReauthenticationResponse;
import io.github.radar.dto.SecondFactorVerification;
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
 * обычные запросы его не продлевают, в других сессиях оно не действует. При включённой 2FA
 * нужен и второй фактор. Неверный пароль расходует тот же лимит попыток, что и вход, иначе
 * через подтверждение можно было бы перебирать пароль в обход лимита входа.
 */
@Service
@RequiredArgsConstructor
public class ReauthenticationService {
    private static final String CONFIRMED_AT = "radar.reauthenticatedAt";

    private final AuthenticationManager authenticationManager;

    private final AttemptLimitService attemptLimitService;

    private final UserRepository userRepository;

    private final UserSessionService userSessionService;

    private final SecondFactorService secondFactorService;

    private final SessionPolicyProperties sessionPolicy;

    private final Clock clock;

    /**
     * Проверяет текущий пароль и второй фактор и подтверждает личность в текущей сессии.
     *
     * @param request текущий пароль и второй фактор
     * @param principal вошедший пользователь
     * @param httpRequest текущий запрос
     * @return время подтверждения и время, до которого оно действует
     * @throws InvalidReauthenticationException если пароль или второй фактор не приняты
     */
    public ReauthenticationResponse reauthenticate(
            ReauthenticateRequest request,
            Principal principal,
            HttpServletRequest httpRequest
    ) {
        confirmIdentity(principal, request.getPassword(), request.getSecondFactor(), httpRequest);
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
     * Проверяет текущий пароль, а при включённой 2FA и второй фактор, не сохраняя
     * подтверждение в сессии. Так проверяются действия, которым недавнего подтверждения
     * недостаточно.
     *
     * @param principal вошедший пользователь
     * @param password текущий пароль
     * @param secondFactor второй фактор или null
     * @param httpRequest текущий запрос
     * @throws InvalidReauthenticationException если пароль или второй фактор не приняты
     */
    public void confirmIdentity(
            Principal principal,
            String password,
            SecondFactorVerification secondFactor,
            HttpServletRequest httpRequest
    ) {
        User user = userRepository.findById(UUID.fromString(principal.getName())).orElseThrow();
        Email email = new Email(user.getEmail());
        String ip = httpRequest.getRemoteAddr();
        attemptLimitService.reserveLogin(email, ip);
        try {
            authenticationManager.authenticate(UsernamePasswordAuthenticationToken
                    .unauthenticated(email.getValue(), password));
        } catch (BadCredentialsException exception) {
            throw new InvalidReauthenticationException(exception);
        }
        attemptLimitService.forgiveLogin(email, ip);
        if (secondFactorService.isEnabled(user.getId()) && (secondFactor == null
                || !secondFactorService.verify(user.getId(), secondFactor))) {
            throw new InvalidReauthenticationException();
        }
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
