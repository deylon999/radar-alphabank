package io.github.radar.service;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import io.github.radar.config.TotpProperties;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.OptionalLong;
import java.util.stream.LongStream;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.binary.Base32;
import org.springframework.security.crypto.encrypt.BytesEncryptor;
import org.springframework.stereotype.Service;

/**
 * Секреты и коды TOTP по RFC 6238: HMAC-SHA1, 6 цифр, шаг 30 секунд — параметры, которые
 * понимают распространённые приложения-аутентификаторы. Секрет вне ответа настройки
 * хранится только зашифрованным.
 *
 * <p>Принимается код текущего, предыдущего и следующего шага: так переносится расхождение
 * часов телефона и сервера. Повторное использование шага отсекает вызывающий код по номеру
 * шага, который возвращает проверка.
 */
@Service
@RequiredArgsConstructor
public class TotpService {
    private static final int SECRET_BYTES = 20;

    private static final int ACCEPTED_DRIFT_STEPS = 1;

    private final SecureRandom random = new SecureRandom();

    private final Base32 base32 = new Base32();

    private final TimeBasedOneTimePasswordGenerator generator;

    private final BytesEncryptor totpSecretEncryptor;

    private final TotpProperties properties;

    private final Clock clock;

    /**
     * Ищет временной шаг, которому соответствует код, среди текущего и соседних шагов.
     *
     * @param secret секрет пользователя
     * @param code шестизначный код из приложения
     * @return номер шага или пустой результат, если код не подходит
     */
    public OptionalLong acceptedStep(byte[] secret, String code) {
        long stepSeconds = generator.getTimeStep().toSeconds();
        long currentStep = clock.instant().getEpochSecond() / stepSeconds;
        SecretKeySpec key = new SecretKeySpec(secret, generator.getAlgorithm());
        return LongStream.rangeClosed(currentStep - ACCEPTED_DRIFT_STEPS,
                        currentStep + ACCEPTED_DRIFT_STEPS)
                .filter(step -> matches(key, Instant.ofEpochSecond(step * stepSeconds), code))
                .findFirst();
    }

    /**
     * Создаёт случайный 160-битный секрет, как рекомендует RFC 4226.
     *
     * @return секрет
     */
    public byte[] newSecret() {
        byte[] secret = new byte[SECRET_BYTES];
        random.nextBytes(secret);
        return secret;
    }

    /**
     * Шифрует секрет для хранения в базе или сессии.
     *
     * @param secret секрет
     * @return шифротекст со случайным вектором инициализации
     */
    public byte[] seal(byte[] secret) {
        return totpSecretEncryptor.encrypt(secret);
    }

    /**
     * Расшифровывает секрет.
     *
     * @param ciphertext шифротекст из {@link #seal(byte[])}
     * @return секрет
     */
    public byte[] open(byte[] ciphertext) {
        return totpSecretEncryptor.decrypt(ciphertext);
    }

    /**
     * Кодирует секрет в Base32 без дополнения для ручного ввода в приложение.
     *
     * @param secret секрет
     * @return секрет в Base32
     */
    public String encode(byte[] secret) {
        return base32.encodeAsString(secret).replace("=", "");
    }

    /**
     * Строит URI otpauth для QR-кода в формате Key Uri Format.
     *
     * @param email email пользователя, имя учётной записи в приложении
     * @param secret секрет
     * @return URI с секретом
     */
    public String provisioningUri(String email, byte[] secret) {
        String issuer = urlEncode(properties.getIssuer());
        return "otpauth://totp/" + issuer + ":" + urlEncode(email)
                + "?secret=" + encode(secret)
                + "&issuer=" + issuer
                + "&algorithm=SHA1&digits=" + generator.getPasswordLength()
                + "&period=" + generator.getTimeStep().toSeconds();
    }

    private boolean matches(SecretKeySpec key, Instant stepStart, String code) {
        try {
            String expected = generator.generateOneTimePasswordString(key, stepStart);
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                    code.getBytes(StandardCharsets.US_ASCII));
        } catch (InvalidKeyException exception) {
            throw new IllegalStateException("Некорректный TOTP-секрет", exception);
        }
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
