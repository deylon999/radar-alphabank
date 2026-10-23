package io.github.radar.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import io.github.radar.config.TotpProperties;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.encrypt.AesBytesEncryptor;
import org.springframework.security.crypto.keygen.KeyGenerators;

class TotpServiceTest {
    private static final byte[] RFC_6238_SECRET = "12345678901234567890".getBytes(StandardCharsets.US_ASCII);

    @Test
    void accepts_code_of_current_step_from_rfc_6238() {
        TotpService sut = at(59);

        assertThat(sut.acceptedStep(RFC_6238_SECRET, "287082")).hasValue(1);
    }

    @Test
    void keeps_leading_zeros_of_code() {
        TotpService sut = at(1_234_567_890);

        assertThat(sut.acceptedStep(RFC_6238_SECRET, "005924")).hasValue(41_152_263);
    }

    @Test
    void accepts_code_of_previous_step_for_clock_drift() {
        TotpService sut = at(59 + 30);

        assertThat(sut.acceptedStep(RFC_6238_SECRET, "287082")).hasValue(1);
    }

    @Test
    void accepts_code_of_next_step_for_clock_drift() {
        TotpService sut = at(29);

        assertThat(sut.acceptedStep(RFC_6238_SECRET, "287082")).hasValue(1);
    }

    @Test
    void rejects_code_two_steps_old() {
        TotpService sut = at(59 + 60);

        assertThat(sut.acceptedStep(RFC_6238_SECRET, "287082")).isEmpty();
    }

    @Test
    void rejects_wrong_code() {
        TotpService sut = at(59);

        assertThat(sut.acceptedStep(RFC_6238_SECRET, "287083")).isEmpty();
    }

    @Test
    void creates_distinct_160_bit_secrets() {
        TotpService sut = at(59);

        byte[] actualSecret = sut.newSecret();

        assertThat(actualSecret).hasSize(20);
        assertThat(actualSecret).isNotEqualTo(sut.newSecret());
    }

    @Test
    void encodes_secret_in_base32_for_authenticator_app() {
        TotpService sut = at(59);

        assertThat(sut.encode(RFC_6238_SECRET)).isEqualTo("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    }

    @Test
    void builds_provisioning_uri_with_issuer_and_email() {
        TotpService sut = at(59);

        String actualUri = sut.provisioningUri("ivan@example.com", RFC_6238_SECRET);

        assertThat(actualUri).isEqualTo("otpauth://totp/Radar:ivan%40example.com"
                + "?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Radar&algorithm=SHA1&digits=6&period=30");
    }

    @Test
    void opens_sealed_secret() {
        TotpService sut = at(59);

        assertThat(sut.open(sut.seal(RFC_6238_SECRET))).isEqualTo(RFC_6238_SECRET);
    }

    @Test
    void seals_same_secret_differently_each_time() {
        TotpService sut = at(59);

        assertThat(sut.seal(RFC_6238_SECRET)).isNotEqualTo(sut.seal(RFC_6238_SECRET));
    }

    private TotpService at(long epochSecond) {
        return new TotpService(
                new TimeBasedOneTimePasswordGenerator(),
                new AesBytesEncryptor(new SecretKeySpec(new byte[32], "AES"), KeyGenerators.secureRandom(12),
                        AesBytesEncryptor.CipherAlgorithm.GCM),
                new TotpProperties("Radar", "unused"),
                Clock.fixed(Instant.ofEpochSecond(epochSecond), ZoneOffset.UTC)
        );
    }
}
