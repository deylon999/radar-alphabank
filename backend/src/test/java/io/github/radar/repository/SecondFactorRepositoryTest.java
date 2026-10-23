package io.github.radar.repository;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.domain.Email;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;

@JdbcTest
@Import({PostgresContainerConfiguration.class, UserRepository.class, TotpFactorRepository.class,
        RecoveryCodeRepository.class})
class SecondFactorRepositoryTest {
    private static final byte[] CIPHERTEXT = {1, 2, 3};

    private static final String FIRST_HASH = "a".repeat(64);

    private static final String SECOND_HASH = "b".repeat(64);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TotpFactorRepository totpFactors;

    @Autowired
    private RecoveryCodeRepository recoveryCodes;

    private UUID userId;

    @BeforeEach
    void createUser() {
        userId = userRepository.insert(new Email("ivan-" + UUID.randomUUID() + "@example.com"), "{argon2}hash").getId();
    }

    @Test
    void enables_factor_only_once() {
        boolean first = totpFactors.insert(userId, CIPHERTEXT, 10, Instant.now());

        boolean actualSecond = totpFactors.insert(userId, new byte[] {9}, 20, Instant.now());

        assertThat(first).isTrue();
        assertThat(actualSecond).isFalse();
        assertThat(totpFactors.findSecret(userId)).hasValue(CIPHERTEXT);
    }

    @Test
    void reports_missing_factor() {
        assertThat(totpFactors.exists(userId)).isFalse();
        assertThat(totpFactors.findSecret(userId)).isEmpty();
    }

    @Test
    void accepts_each_step_only_once() {
        totpFactors.insert(userId, CIPHERTEXT, 10, Instant.now());

        boolean first = totpFactors.acceptStep(userId, 11);
        boolean actualRepeat = totpFactors.acceptStep(userId, 11);

        assertThat(first).isTrue();
        assertThat(actualRepeat).isFalse();
    }

    @Test
    void rejects_step_earlier_than_last_accepted() {
        totpFactors.insert(userId, CIPHERTEXT, 10, Instant.now());

        assertThat(totpFactors.acceptStep(userId, 9)).isFalse();
        assertThat(totpFactors.acceptStep(userId, 10)).isFalse();
    }

    @Test
    void redeems_recovery_code_only_once() {
        totpFactors.insert(userId, CIPHERTEXT, 10, Instant.now());
        recoveryCodes.replace(userId, List.of(FIRST_HASH, SECOND_HASH));

        boolean first = recoveryCodes.redeem(userId, FIRST_HASH);
        boolean actualRepeat = recoveryCodes.redeem(userId, FIRST_HASH);

        assertThat(first).isTrue();
        assertThat(actualRepeat).isFalse();
        assertThat(recoveryCodes.redeem(userId, SECOND_HASH)).isTrue();
    }

    @Test
    void keeps_recovery_codes_of_each_user_separate() {
        UUID otherId = userRepository.insert(new Email("maria-" + UUID.randomUUID() + "@example.com"), "{argon2}hash").getId();
        totpFactors.insert(userId, CIPHERTEXT, 10, Instant.now());
        recoveryCodes.replace(userId, List.of(FIRST_HASH));

        assertThat(recoveryCodes.redeem(otherId, FIRST_HASH)).isFalse();
        assertThat(recoveryCodes.redeem(userId, FIRST_HASH)).isTrue();
    }

    @Test
    void replaces_previous_set_of_recovery_codes() {
        totpFactors.insert(userId, CIPHERTEXT, 10, Instant.now());
        recoveryCodes.replace(userId, List.of(FIRST_HASH));

        recoveryCodes.replace(userId, List.of(SECOND_HASH));

        assertThat(recoveryCodes.redeem(userId, FIRST_HASH)).isFalse();
        assertThat(recoveryCodes.redeem(userId, SECOND_HASH)).isTrue();
    }

    @Test
    void deletes_recovery_codes_with_factor() {
        totpFactors.insert(userId, CIPHERTEXT, 10, Instant.now());
        recoveryCodes.replace(userId, List.of(FIRST_HASH));

        totpFactors.delete(userId);

        assertThat(totpFactors.exists(userId)).isFalse();
        assertThat(recoveryCodes.redeem(userId, FIRST_HASH)).isFalse();
    }
}
