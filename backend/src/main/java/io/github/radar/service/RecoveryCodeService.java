package io.github.radar.service;

import io.github.radar.repository.RecoveryCodeRepository;
import io.github.radar.security.Sha256Hasher;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Одноразовые резервные коды.
 *
 * <p>Код — 128 случайных бит в виде четырёх групп по восемь шестнадцатеричных символов.
 * Перебрать такой код нельзя, поэтому хранится быстрый SHA-256, а не медленный хеш пароля:
 * это позволяет найти и погасить код одним условным запросом.
 */
@Service
@RequiredArgsConstructor
public class RecoveryCodeService {
    private static final int CODE_COUNT = 10;

    private static final int CODE_BYTES = 16;

    private static final int GROUP_LENGTH = 8;

    private final SecureRandom random = new SecureRandom();

    private final HexFormat hex = HexFormat.of();

    private final RecoveryCodeRepository recoveryCodeRepository;

    private final Sha256Hasher sha256;

    /**
     * Создаёт новый набор кодов взамен прежнего. Вызывается в транзакции.
     *
     * @param userId ID пользователя с включённой 2FA
     * @return коды для показа пользователю, на сервере остаются только хеши
     */
    public List<String> issue(UUID userId) {
        List<String> codes = IntStream.range(0, CODE_COUNT).mapToObj(index -> newCode()).toList();
        recoveryCodeRepository.replace(userId, codes.stream().map(sha256::hex).toList());
        return codes;
    }

    /**
     * Погашает код, если он есть в наборе пользователя.
     *
     * @param userId ID пользователя
     * @param code резервный код
     * @return true, если код был действующим
     */
    public boolean redeem(UUID userId, String code) {
        return recoveryCodeRepository.redeem(userId, sha256.hex(code));
    }

    private String newCode() {
        byte[] bytes = new byte[CODE_BYTES];
        random.nextBytes(bytes);
        String digits = hex.formatHex(bytes);
        return String.join("-", IntStream.range(0, digits.length() / GROUP_LENGTH)
                .mapToObj(group -> digits.substring(group * GROUP_LENGTH,
                        (group + 1) * GROUP_LENGTH))
                .toList());
    }
}
