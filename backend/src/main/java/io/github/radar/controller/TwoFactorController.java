package io.github.radar.controller;

import io.github.radar.dto.RecoveryCodesResponse;
import io.github.radar.dto.SensitiveActionRequest;
import io.github.radar.dto.TotpSetupResponse;
import io.github.radar.dto.VerifyTotpRequest;
import io.github.radar.service.TwoFactorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Управление двухфакторной аутентификацией текущего пользователя.
 */
@RestController
@RequestMapping("/auth/2fa")
@RequiredArgsConstructor
public class TwoFactorController {
    private final TwoFactorService twoFactorService;

    /**
     * Начинает настройку TOTP.
     *
     * @param authentication вход текущей сессии
     * @param httpRequest текущий запрос
     * @return секрет и URI для приложения-аутентификатора
     */
    @PostMapping("/setup")
    public TotpSetupResponse setup(Authentication authentication, HttpServletRequest httpRequest) {
        return twoFactorService.setup(authentication, httpRequest);
    }

    /**
     * Включает TOTP первым кодом.
     *
     * @param request первый код
     * @param authentication вход текущей сессии
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return резервные коды
     */
    @PostMapping("/enable")
    public RecoveryCodesResponse enable(
            @Valid @RequestBody VerifyTotpRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        return twoFactorService.enable(request, authentication, httpRequest, httpResponse);
    }

    /**
     * Отключает 2FA.
     *
     * @param request пароль и второй фактор
     * @param authentication вход текущей сессии
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     */
    @PostMapping("/disable")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disable(
            @Valid @RequestBody SensitiveActionRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        twoFactorService.disable(request, authentication, httpRequest, httpResponse);
    }

    /**
     * Перевыпускает резервные коды.
     *
     * @param request пароль и второй фактор
     * @param authentication вход текущей сессии
     * @param httpRequest текущий запрос
     * @return новые резервные коды
     */
    @PostMapping("/recovery-codes")
    public RecoveryCodesResponse regenerateRecoveryCodes(
            @Valid @RequestBody SensitiveActionRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        return twoFactorService.regenerateRecoveryCodes(request, authentication, httpRequest);
    }
}
