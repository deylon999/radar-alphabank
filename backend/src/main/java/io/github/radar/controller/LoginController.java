package io.github.radar.controller;

import io.github.radar.dto.AuthenticatedLoginResponse;
import io.github.radar.dto.LoginRequest;
import io.github.radar.dto.LoginResponse;
import io.github.radar.dto.SecondFactorVerification;
import io.github.radar.service.LoginService;
import io.github.radar.service.SecondFactorLoginService;
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
 * Вход по email и паролю и второй шаг входа с 2FA.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class LoginController {
    private final LoginService loginService;

    private final SecondFactorLoginService secondFactorLoginService;

    /**
     * Выполняет вход.
     *
     * @param request email и пароль
     * @param currentUser пользователь сессии или null, если вход не выполнен
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return завершённый вход или требование второго фактора
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

    /**
     * Завершает вход вторым фактором.
     *
     * @param verification TOTP-код или резервный код
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return завершённый вход
     */
    @PostMapping("/login/2fa")
    public AuthenticatedLoginResponse verifySecondFactor(
            @Valid @RequestBody SecondFactorVerification verification,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        return secondFactorLoginService.verify(verification, httpRequest, httpResponse);
    }
}
