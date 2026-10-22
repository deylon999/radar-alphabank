package io.github.radar.controller;

import io.github.radar.dto.ReauthenticateRequest;
import io.github.radar.dto.ReauthenticationResponse;
import io.github.radar.service.ReauthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Повторное подтверждение личности.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class ReauthenticationController {
    private final ReauthenticationService reauthenticationService;

    /**
     * Подтверждает личность текущим паролем.
     *
     * @param request текущий пароль
     * @param user вошедший пользователь
     * @param httpRequest текущий запрос
     * @return время подтверждения и время, до которого оно действует
     */
    @PostMapping("/reauthenticate")
    public ReauthenticationResponse reauthenticate(
            @Valid @RequestBody ReauthenticateRequest request,
            Principal user,
            HttpServletRequest httpRequest
    ) {
        return reauthenticationService.reauthenticate(request, user, httpRequest);
    }
}
