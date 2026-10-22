package io.github.radar.config;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Настройки TOTP. Ключ шифрования секретов задаётся окружением и не попадает в строковое
 * представление.
 */
@Getter
@RequiredArgsConstructor
@ToString
@ConfigurationProperties("radar.totp")
public class TotpProperties {
    private final String issuer;

    @ToString.Exclude
    private final String encryptionKey;
}
