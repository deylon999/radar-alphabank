package io.github.radar.service;

import io.github.radar.config.SessionPolicyProperties;
import io.github.radar.domain.UserAgent;
import io.github.radar.dto.SessionResponse;
import io.github.radar.dto.SessionsResponse;
import io.github.radar.exception.SessionNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;

/**
 * Жизненный цикл сессий пользователя: описание входа, выход, список и завершение сессий.
 *
 * <p>Сессии пользователя находятся по индексу Spring Session: имя принципала — UUID
 * пользователя. Публичный ID сессии хранится в её атрибуте и не совпадает с cookie.
 */
@Service
@RequiredArgsConstructor
public class UserSessionService {
    private static final String PUBLIC_ID = "radar.publicSessionId";

    private static final String AUTHENTICATED_AT = "radar.authenticatedAt";

    private static final String BROWSER = "radar.browser";

    private static final String OPERATING_SYSTEM = "radar.os";

    private final FindByIndexNameSessionRepository<? extends Session> sessionRepository;

    private final SessionPolicyProperties sessionPolicy;

    private final Clock clock;

    /**
     * Записывает в текущую сессию сведения о завершённом входе.
     *
     * @param request текущий запрос
     * @param authenticatedAt время завершения входа
     */
    public void describeLogin(HttpServletRequest request, Instant authenticatedAt) {
        UserAgent userAgent = new UserAgent(request.getHeader(HttpHeaders.USER_AGENT));
        HttpSession session = request.getSession();
        session.setAttribute(PUBLIC_ID, UUID.randomUUID());
        session.setAttribute(AUTHENTICATED_AT, authenticatedAt);
        session.setAttribute(BROWSER, userAgent.browser().orElse(null));
        session.setAttribute(OPERATING_SYSTEM, userAgent.operatingSystem().orElse(null));
    }

    /**
     * Возвращает действующие сессии пользователя, начиная с последней активной.
     *
     * @param user вошедший пользователь
     * @param request текущий запрос
     * @return сессии пользователя
     */
    public SessionsResponse list(Principal user, HttpServletRequest request) {
        String currentId = request.getSession().getId();
        return new SessionsResponse(activeSessions(user).stream()
                .map(session -> describe(session, currentId))
                .sorted(Comparator.comparing(SessionResponse::getLastAccessedAt).reversed())
                .toList());
    }

    /**
     * Завершает сессию пользователя по публичному ID. Если это текущая сессия,
     * Spring Session удаляет и её cookie.
     *
     * @param user вошедший пользователь
     * @param publicId публичный ID сессии
     * @param request текущий запрос
     * @throws SessionNotFoundException если у пользователя нет такой действующей сессии
     */
    public void revoke(Principal user, UUID publicId, HttpServletRequest request) {
        Session session = activeSessions(user).stream()
                .filter(candidate -> publicId.equals(candidate.getAttribute(PUBLIC_ID)))
                .findFirst()
                .orElseThrow(SessionNotFoundException::new);
        HttpSession current = request.getSession();
        if (session.getId().equals(current.getId())) {
            current.invalidate();
            return;
        }
        sessionRepository.deleteById(session.getId());
    }

    /**
     * Завершает все сессии пользователя, кроме текущей.
     *
     * @param user вошедший пользователь
     * @param request текущий запрос
     */
    public void revokeOthers(Principal user, HttpServletRequest request) {
        String currentId = request.getSession().getId();
        activeSessions(user).stream()
                .map(Session::getId)
                .filter(id -> !id.equals(currentId))
                .forEach(sessionRepository::deleteById);
    }

    /**
     * Проверяет, прошёл ли абсолютный предел входа. Обычные запросы его не сдвигают.
     *
     * @param session сессия
     * @return true, если в сессии выполнен вход и с него прошёл предельный срок
     */
    public boolean isPastAbsoluteLimit(HttpSession session) {
        return pastAbsoluteLimit((Instant) session.getAttribute(AUTHENTICATED_AT));
    }

    /**
     * Возвращает время завершения входа в текущей сессии.
     *
     * @param session сессия, в которой выполнен вход
     * @return время входа
     */
    public Instant authenticatedAt(HttpSession session) {
        return (Instant) session.getAttribute(AUTHENTICATED_AT);
    }

    /**
     * Завершает сессию, вышедшую за абсолютный предел.
     *
     * @param session сессия
     */
    public void expire(HttpSession session) {
        session.invalidate();
    }

    /**
     * Завершает текущую сессию на сервере. Cookie удаляет Spring Session.
     *
     * @param request текущий запрос
     */
    public void logout(HttpServletRequest request) {
        request.getSession().invalidate();
    }

    private Collection<? extends Session> activeSessions(Principal user) {
        return sessionRepository.findByPrincipalName(user.getName()).values().stream()
                .filter(session -> !pastAbsoluteLimit(session.getAttribute(AUTHENTICATED_AT)))
                .toList();
    }

    private boolean pastAbsoluteLimit(Instant authenticatedAt) {
        return authenticatedAt != null
                && !clock.instant().isBefore(authenticatedAt.plus(sessionPolicy.absoluteTimeout()));
    }

    private SessionResponse describe(Session session, String currentId) {
        return new SessionResponse(
                session.getAttribute(PUBLIC_ID),
                session.getAttribute(BROWSER),
                session.getAttribute(OPERATING_SYSTEM),
                session.getAttribute(AUTHENTICATED_AT),
                session.getLastAccessedTime(),
                session.getId().equals(currentId)
        );
    }
}
