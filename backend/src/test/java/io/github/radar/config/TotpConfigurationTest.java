package io.github.radar.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Arrays;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.encrypt.BytesEncryptor;

class TotpConfigurationTest {
    private final TotpConfiguration sut = new TotpConfiguration();

    @Test
    void rejects_key_shorter_than_256_bits() {
        TotpProperties properties = new TotpProperties("Radar", Base64.getEncoder().encodeToString(new byte[16]));

        assertThatThrownBy(() -> sut.totpSecretEncryptor(properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RADAR_TOTP_ENCRYPTION_KEY");
    }

    @Test
    void decrypts_only_with_same_key() {
        BytesEncryptor encryptor = sut.totpSecretEncryptor(new TotpProperties("Radar", key((byte) 1)));
        BytesEncryptor otherKey = sut.totpSecretEncryptor(new TotpProperties("Radar", key((byte) 2)));
        byte[] ciphertext = encryptor.encrypt(new byte[] {1, 2, 3});

        assertThat(encryptor.decrypt(ciphertext)).containsExactly(1, 2, 3);
        assertThatThrownBy(() -> otherKey.decrypt(ciphertext)).isInstanceOf(IllegalStateException.class);
    }

    private String key(byte filler) {
        byte[] key = new byte[32];
        Arrays.fill(key, filler);
        return Base64.getEncoder().encodeToString(key);
    }
}
