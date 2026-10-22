package io.github.radar.controller;

import io.github.radar.dto.LoginRequest;
import io.github.radar.dto.LoginResponse;
import io.github.radar.service.LoginService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Вход по email и паролю.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class LoginController {
    private final LoginService loginService;

    /**
     * Выполняет вход.
     *
     * @param request email и пароль
     * @param currentUser пользователь сессии или null, если вход не выполнен
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return описание входа
     */
    @PostMapping("/login")
    public LoginResponse login(
            @Valid @RequestBody LoginRequest request,
            Principal currentUser,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        return loginService.login(request, currentUser, httpRequest, httpResponse);
    }
}
