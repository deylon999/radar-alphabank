package io.github.radar.service;

import io.github.radar.config.SessionPolicyProperties;
import io.github.radar.domain.TotpSetup;
import io.github.radar.dto.RecoveryCodesResponse;
import io.github.radar.dto.SensitiveActionRequest;
import io.github.radar.dto.TotpSetupResponse;
import io.github.radar.dto.VerifyTotpRequest;
import io.github.radar.exception.InvalidSecondFactorException;
import io.github.radar.exception.TotpSetupExpiredException;
import io.github.radar.exception.TwoFactorAlreadyEnabledException;
import io.github.radar.exception.TwoFactorNotEnabledException;
import io.github.radar.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * Настройка, включение и отключение TOTP и перевыпуск резервных кодов.
 *
 * <p>Настройка хранится в текущей сессии и сама 2FA не включает: фактор включается только
 * после первого верного кода. Включение и отключение меняют способ входа, поэтому завершают
 * остальные сессии, меняют ID текущей и CSRF-токен и сбрасывают подтверждение личности.
 * Записи в PostgreSQL и операции с сессиями в Redis не атомарны вместе.
 */
@Service
@RequiredArgsConstructor
public class TwoFactorService {
    private static final String TOTP_SETUP = "radar.totpSetup";

    private final SecondFactorService secondFactorService;

    private final TotpService totpService;

    private final ReauthenticationService reauthenticationService;

    private final SessionRenewalService sessionRenewalService;

    private final UserRepository userRepository;

    private final SessionPolicyProperties sessionPolicy;

    private final Clock clock;

    /**
     * Начинает настройку TOTP в текущей сессии. Повторный вызов заменяет прежнюю настройку.
     *
     * @param principal вошедший пользователь
     * @param httpRequest текущий запрос
     * @return секрет и URI для приложения-аутентификатора
     * @throws io.github.radar.exception.ReauthenticationRequiredException если личность
     *         не подтверждена
     * @throws TwoFactorAlreadyEnabledException если 2FA уже включена
     */
    public TotpSetupResponse setup(Principal principal, HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession();
        reauthenticationService.requireRecentConfirmation(session);
        UUID userId = UUID.fromString(principal.getName());
        if (secondFactorService.isEnabled(userId)) {
            throw new TwoFactorAlreadyEnabledException();
        }
        byte[] secret = totpService.newSecret();
        Instant expiresAt = clock.instant().plus(sessionPolicy.totpSetupTimeout());
        session.setAttribute(TOTP_SETUP, new TotpSetup(totpService.seal(secret), expiresAt));
        String email = userRepository.findById(userId).orElseThrow().getEmail();
        return new TotpSetupResponse(totpService.encode(secret),
                totpService.provisioningUri(email, secret), expiresAt);
    }

    /**
     * Включает TOTP первым верным кодом для настройки текущей сессии.
     *
     * @param request первый код
     * @param authentication вход текущей сессии
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @return резервные коды, выдаются один раз
     * @throws io.github.radar.exception.ReauthenticationRequiredException если личность
     *         не подтверждена
     * @throws TwoFactorAlreadyEnabledException если 2FA уже включена
     * @throws TotpSetupExpiredException если настройки нет или она истекла
     * @throws InvalidSecondFactorException если код неверен
     */
    public RecoveryCodesResponse enable(
            VerifyTotpRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        HttpSession session = httpRequest.getSession();
        reauthenticationService.requireRecentConfirmation(session);
        UUID userId = UUID.fromString(authentication.getName());
        if (secondFactorService.isEnabled(userId)) {
            throw new TwoFactorAlreadyEnabledException();
        }
        TotpSetup setup = (TotpSetup) session.getAttribute(TOTP_SETUP);
        if (setup == null || !clock.instant().isBefore(setup.getExpiresAt())) {
            throw new TotpSetupExpiredException();
        }
        long acceptedStep = secondFactorService
                .acceptSetupCode(userId, setup.getSecretCiphertext(), request.getCode())
                .orElseThrow(() -> new InvalidSecondFactorException(userId));
        List<String> recoveryCodes =
                secondFactorService.enable(userId, setup.getSecretCiphertext(), acceptedStep);
        session.removeAttribute(TOTP_SETUP);
        sessionRenewalService.renewAfterCredentialChange(authentication, httpRequest, httpResponse);
        return new RecoveryCodesResponse(recoveryCodes);
    }

    /**
     * Отключает 2FA после проверки пароля и второго фактора в самом запросе.
     *
     * @param request пароль и второй фактор
     * @param authentication вход текущей сессии
     * @param httpRequest текущий запрос
     * @param httpResponse текущий ответ
     * @throws TwoFactorNotEnabledException если 2FA не включена
     * @throws io.github.radar.exception.InvalidReauthenticationException если пароль или
     *         второй фактор не приняты
     */
    public void disable(
            SensitiveActionRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        UUID userId = confirmWithSecondFactor(request, authentication, httpRequest);
        secondFactorService.disable(userId);
        sessionRenewalService.renewAfterCredentialChange(authentication, httpRequest, httpResponse);
    }

    /**
     * Заменяет резервные коды новым набором после проверки пароля и второго фактора.
     *
     * @param request пароль и второй фактор
     * @param principal вошедший пользователь
     * @param httpRequest текущий запрос
     * @return новые коды, выдаются один раз
     * @throws TwoFactorNotEnabledException если 2FA не включена
     * @throws io.github.radar.exception.InvalidReauthenticationException если пароль или
     *         второй фактор не приняты
     */
    public RecoveryCodesResponse regenerateRecoveryCodes(
            SensitiveActionRequest request,
            Principal principal,
            HttpServletRequest httpRequest
    ) {
        UUID userId = confirmWithSecondFactor(request, principal, httpRequest);
        List<String> recoveryCodes = secondFactorService.replaceRecoveryCodes(userId);
        reauthenticationService.resetConfirmation(httpRequest.getSession());
        return new RecoveryCodesResponse(recoveryCodes);
    }

    private UUID confirmWithSecondFactor(
            SensitiveActionRequest request,
            Principal principal,
            HttpServletRequest httpRequest
    ) {
        UUID userId = UUID.fromString(principal.getName());
        if (!secondFactorService.isEnabled(userId)) {
            throw new TwoFactorNotEnabledException();
        }
        reauthenticationService.confirmIdentity(principal, request.getPassword(),
                request.getSecondFactor(), httpRequest);
        return userId;
    }
}
