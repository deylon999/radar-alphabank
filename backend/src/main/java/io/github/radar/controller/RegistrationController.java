package io.github.radar.controller;

import io.github.radar.dto.RegisterRequest;
import io.github.radar.dto.RegisterResponse;
import io.github.radar.service.RegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Регистрация пользователя.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class RegistrationController {
    private final RegistrationService registrationService;

    /**
     * Регистрирует пользователя.
     *
     * @param request email и пароль
     * @param httpRequest текущий запрос
     * @return ID созданного пользователя
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest
    ) {
        return registrationService.register(request, httpRequest.getRemoteAddr());
    }
}
