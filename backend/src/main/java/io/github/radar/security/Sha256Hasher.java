package io.github.radar.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.stereotype.Component;

/**
 * SHA-256 для значений, которые не хранятся открыто, но не требуют медленного хеша:
 * ключей счётчиков с email и случайных резервных кодов со 128 битами энтропии.
 * Пароли так не хешируются.
 */
@Component
public class Sha256Hasher {
    /**
     * Вычисляет SHA-256 строки в UTF-8.
     *
     * @param value исходное значение
     * @return хеш в шестнадцатеричном виде, 64 символа
     */
    public String hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 недоступен", exception);
        }
    }
}
