package io.github.radar.service;

import io.github.radar.domain.Email;
import io.github.radar.dto.LoginRequest;
import io.github.radar.dto.LoginResponse;
import io.github.radar.exception.AlreadyAuthenticatedException;
import io.github.radar.exception.InvalidCredentialsException;
import io.github.radar.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * Первый шаг входа: проверка email и пароля.
 *
 * <p>Без 2FA вход завершается сразу. При включённой 2FA сессия только переходит
 * в ожидание второго фактора, пользователь ещё не вошёл.
 */
@Service
@RequiredArgsConstructor
public class LoginService {
    private final AuthenticationManager authenticationManager;

    private final AttemptLimitService attemptLimitService;

    private final SecondFactorService secondFactorService;

    private final LoginSessionService loginSessionService;

    /**
     * Проверяет учётные данные и завершает вход или переводит его в ожидание второго фактора.
     *
     * <p>ID сессии и CSRF-токен меняются: cookie и токен, выданные до входа, больше
     * не действуют.
     *
     * @param request email и пароль
     * @param currentUser пользователь сессии или null, если вход не выполнен
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return завершённый вход или требование второго фактора
     * @throws AlreadyAuthenticatedException если вход уже выполнен
     * @throws InvalidCredentialsException если email или пароль неверны
     * @throws io.github.radar.exception.TooManyAttemptsException если исчерпан лимит попыток
     */
    public LoginResponse login(
            LoginRequest request,
            Principal currentUser,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        if (currentUser != null) {
            throw new AlreadyAuthenticatedException();
        }
        Email email = new Email(request.getEmail());
        String ip = httpRequest.getRemoteAddr();
        attemptLimitService.reserveLogin(email, ip);
        Authentication checked = checkCredentials(email, request.getPassword());
        attemptLimitService.forgiveLogin(email, ip);
        UUID userId = UUID.fromString(checked.getName());
        if (secondFactorService.isEnabled(userId)) {
            return loginSessionService.awaitSecondFactor(userId, checked, httpRequest,
                    httpResponse);
        }
        return loginSessionService.complete(new AuthenticatedUser(userId, email.getValue()), false,
                httpRequest, httpResponse);
    }

    private Authentication checkCredentials(Email email, String password) {
        try {
            return authenticationManager.authenticate(UsernamePasswordAuthenticationToken
                    .unauthenticated(email.getValue(), password));
        } catch (BadCredentialsException exception) {
            throw new InvalidCredentialsException(exception);
        }
    }
}
