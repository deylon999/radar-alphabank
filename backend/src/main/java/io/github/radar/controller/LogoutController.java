package io.github.radar.controller;

import io.github.radar.service.UserSessionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Выход из текущей сессии.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class LogoutController {
    private final UserSessionService userSessionService;

    /**
     * Завершает текущую сессию. Остальные сессии пользователя сохраняются.
     *
     * @param request текущий запрос
     */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        userSessionService.logout(request);
    }
}
