package io.github.radar.service;

import io.github.radar.dto.RecoveryCodeVerification;
import io.github.radar.dto.SecondFactorVerification;
import io.github.radar.dto.TotpVerification;
import io.github.radar.exception.TwoFactorAlreadyEnabledException;
import io.github.radar.repository.TotpFactorRepository;
import java.time.Clock;
import java.util.List;
import java.util.OptionalLong;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Включённый второй фактор пользователя: проверка, включение и отключение.
 *
 * <p>Неверные TOTP-коды ограничены лимитом на пользователя. Резервные коды лимит не расходуют:
 * их нельзя подобрать, а пользователь, исчерпавший лимит TOTP, может войти резервным кодом.
 */
@Service
@RequiredArgsConstructor
public class SecondFactorService {
    private final TotpFactorRepository totpFactorRepository;

    private final RecoveryCodeService recoveryCodeService;

    private final TotpService totpService;

    private final AttemptLimitService attemptLimitService;

    private final Clock clock;

    /**
     * Проверяет, включена ли у пользователя 2FA.
     *
     * @param userId ID пользователя
     * @return true, если включена
     */
    public boolean isEnabled(UUID userId) {
        return totpFactorRepository.exists(userId);
    }

    /**
     * Проверяет второй фактор и погашает его: принятый TOTP-шаг и резервный код повторно
     * не принимаются.
     *
     * @param userId ID пользователя
     * @param verification TOTP-код или резервный код
     * @return true, если фактор принят
     * @throws io.github.radar.exception.TooManyAttemptsException если исчерпан лимит TOTP-кодов
     */
    public boolean verify(UUID userId, SecondFactorVerification verification) {
        return switch (verification) {
            case TotpVerification totp -> verifyTotp(userId, totp.getCode());
            case RecoveryCodeVerification recovery ->
                    recoveryCodeService.redeem(userId, recovery.getCode());
        };
    }

    /**
     * Проверяет первый код для секрета из настройки.
     *
     * @param userId ID пользователя
     * @param secretCiphertext зашифрованный секрет настройки
     * @param code шестизначный код
     * @return шаг принятого кода или пустой результат
     * @throws io.github.radar.exception.TooManyAttemptsException если исчерпан лимит TOTP-кодов
     */
    public OptionalLong acceptSetupCode(UUID userId, byte[] secretCiphertext, String code) {
        attemptLimitService.reserveSecondFactor(userId);
        OptionalLong step = totpService.acceptedStep(totpService.open(secretCiphertext), code);
        if (step.isPresent()) {
            attemptLimitService.forgiveSecondFactor(userId);
        }
        return step;
    }

    /**
     * Включает TOTP и выдаёт резервные коды в одной транзакции.
     *
     * @param userId ID пользователя
     * @param secretCiphertext зашифрованный секрет
     * @param acceptedStep шаг первого принятого кода: его код повторно не подойдёт
     * @return резервные коды
     * @throws TwoFactorAlreadyEnabledException если фактор включён параллельно
     */
    @Transactional
    public List<String> enable(UUID userId, byte[] secretCiphertext, long acceptedStep) {
        if (!totpFactorRepository.insert(userId, secretCiphertext, acceptedStep, clock.instant())) {
            throw new TwoFactorAlreadyEnabledException();
        }
        return recoveryCodeService.issue(userId);
    }

    /**
     * Отключает TOTP и удаляет резервные коды.
     *
     * @param userId ID пользователя
     */
    public void disable(UUID userId) {
        totpFactorRepository.delete(userId);
    }

    /**
     * Заменяет резервные коды новым набором в одной транзакции.
     *
     * @param userId ID пользователя с включённой 2FA
     * @return новые коды
     */
    @Transactional
    public List<String> replaceRecoveryCodes(UUID userId) {
        return recoveryCodeService.issue(userId);
    }

    private boolean verifyTotp(UUID userId, String code) {
        attemptLimitService.reserveSecondFactor(userId);
        boolean accepted = totpFactorRepository.findSecret(userId)
                .map(totpService::open)
                .map(secret -> totpService.acceptedStep(secret, code))
                .filter(OptionalLong::isPresent)
                .map(step -> totpFactorRepository.acceptStep(userId, step.getAsLong()))
                .orElse(false);
        if (accepted) {
            attemptLimitService.forgiveSecondFactor(userId);
        }
        return accepted;
    }
}
