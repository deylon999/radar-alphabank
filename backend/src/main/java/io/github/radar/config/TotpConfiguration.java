package io.github.radar.config;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import java.util.Base64;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.encrypt.AesBytesEncryptor;
import org.springframework.security.crypto.encrypt.BytesEncryptor;
import org.springframework.security.crypto.keygen.KeyGenerators;

/**
 * Генерация кодов TOTP и шифрование TOTP-секретов.
 *
 * <p>Секреты шифруются AES-256-GCM ключом из окружения: копия базы без ключа не раскрывает
 * секреты. Ключ хранится отдельно от базы; смена ключа требует перешифрования секретов.
 */
@Configuration
@EnableConfigurationProperties(TotpProperties.class)
public class TotpConfiguration {
    private static final int KEY_BYTES = 32;

    private static final int IV_BYTES = 12;

    /**
     * Создаёт генератор кодов: HMAC-SHA1, 6 цифр, шаг 30 секунд.
     *
     * @return генератор кодов
     */
    @Bean
    public TimeBasedOneTimePasswordGenerator totpGenerator() {
        return new TimeBasedOneTimePasswordGenerator();
    }

    /**
     * Создаёт шифратор TOTP-секретов.
     *
     * @param properties настройки TOTP с ключом в Base64
     * @return шифратор AES-GCM со случайным 96-битным вектором для каждого секрета
     * @throws IllegalStateException если ключ не задан или его длина не 256 бит
     */
    @Bean
    public BytesEncryptor totpSecretEncryptor(TotpProperties properties) {
        byte[] key = Base64.getDecoder().decode(properties.getEncryptionKey());
        if (key.length != KEY_BYTES) {
            throw new IllegalStateException(
                    "RADAR_TOTP_ENCRYPTION_KEY должен содержать 32 байта в Base64");
        }
        return new AesBytesEncryptor(new SecretKeySpec(key, "AES"),
                KeyGenerators.secureRandom(IV_BYTES), AesBytesEncryptor.CipherAlgorithm.GCM);
    }
}
