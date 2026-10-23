package io.github.radar.controller;

import io.github.radar.dto.ChangePasswordRequest;
import io.github.radar.service.PasswordChangeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Смена пароля.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class PasswordController {
    private final PasswordChangeService passwordChangeService;

    /**
     * Меняет пароль. Остальные сессии завершаются, cookie текущей обновляется.
     *
     * @param request новый пароль
     * @param authentication вход текущей сессии
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     */
    @PatchMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        passwordChangeService.change(request, authentication, httpRequest, httpResponse);
    }
}
