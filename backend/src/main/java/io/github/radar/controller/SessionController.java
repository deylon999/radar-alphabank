package io.github.radar.controller;

import io.github.radar.dto.SessionsResponse;
import io.github.radar.service.UserSessionService;
import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Управление своими сессиями.
 */
@RestController
@RequestMapping("/auth/sessions")
@RequiredArgsConstructor
public class SessionController {
    private final UserSessionService userSessionService;

    /**
     * Возвращает действующие сессии текущего пользователя.
     *
     * @param user вошедший пользователь
     * @param request текущий запрос
     * @return сессии пользователя
     */
    @GetMapping
    public SessionsResponse getSessions(Principal user, HttpServletRequest request) {
        return userSessionService.list(user, request);
    }

    /**
     * Завершает свою сессию по публичному ID.
     *
     * @param id публичный ID из списка сессий
     * @param user вошедший пользователь
     * @param request текущий запрос
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeSession(@PathVariable UUID id, Principal user, HttpServletRequest request) {
        userSessionService.revoke(user, id, request);
    }

    /**
     * Завершает все свои сессии, кроме текущей.
     *
     * @param user вошедший пользователь
     * @param request текущий запрос
     */
    @PostMapping("/revoke-others")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeOtherSessions(Principal user, HttpServletRequest request) {
        userSessionService.revokeOthers(user, request);
    }
}
