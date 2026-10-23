package io.github.radar.controller;

import io.github.radar.dto.CsrfResponse;
import io.github.radar.service.CsrfService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Выдача CSRF-токена до входа и после него.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class CsrfController {
    private final CsrfService csrfService;

    /**
     * Возвращает токен текущей сессии.
     *
     * @param request текущий запрос
     * @return токен и имя заголовка
     */
    @GetMapping("/csrf")
    public CsrfResponse getCsrfToken(HttpServletRequest request) {
        return csrfService.currentToken(request);
    }
}
