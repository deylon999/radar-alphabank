package io.github.radar.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.radar.exception.TooManyAttemptsException;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class ConcurrencyLimitedPasswordEncoderTest {
    private final CountDownLatch delegateEntered = new CountDownLatch(1);

    private final CountDownLatch releaseDelegate = new CountDownLatch(1);

    private final PasswordEncoder blockingDelegate = new PasswordEncoder() {
        @Override
        public String encode(CharSequence rawPassword) {
            delegateEntered.countDown();
            await(releaseDelegate);
            return "hash:" + rawPassword;
        }

        @Override
        public boolean matches(CharSequence rawPassword, String encodedPassword) {
            return encodedPassword.equals("hash:" + rawPassword);
        }
    };

    private final PasswordEncoder sut =
            new ConcurrencyLimitedPasswordEncoder(blockingDelegate, 1, Duration.ofMillis(100));

    @Test
    void rejects_check_while_all_slots_are_busy_with_retry_after() throws Exception {
        final CompletableFuture<String> busy = CompletableFuture.supplyAsync(() -> sut.encode("first"));
        delegateEntered.await(5, TimeUnit.SECONDS);

        assertThatThrownBy(() -> sut.matches("second", "hash:second"))
                .isInstanceOf(TooManyAttemptsException.class)
                .extracting(exception -> ((TooManyAttemptsException) exception).getRetryAfter())
                .isEqualTo(Duration.ofSeconds(1));

        releaseDelegate.countDown();
        assertThat(busy.get(5, TimeUnit.SECONDS)).isEqualTo("hash:first");
    }

    @Test
    void frees_slot_after_check_completes() throws Exception {
        releaseDelegate.countDown();
        sut.encode("first");

        boolean actualMatches = sut.matches("second", "hash:second");

        assertThat(actualMatches).isTrue();
    }

    @Test
    void rejects_password_that_delegate_rejects() {
        releaseDelegate.countDown();

        boolean actualMatches = sut.matches("second", "hash:other");

        assertThat(actualMatches).isFalse();
    }

    @Test
    void restores_interrupt_flag_when_interrupted_while_waiting() throws Exception {
        final CompletableFuture<String> busy = CompletableFuture.supplyAsync(() -> sut.encode("first"));
        delegateEntered.await(5, TimeUnit.SECONDS);
        Thread.currentThread().interrupt();

        assertThatThrownBy(() -> sut.matches("second", "hash:second"))
                .isInstanceOf(TooManyAttemptsException.class);
        boolean actualInterrupted = Thread.interrupted();

        assertThat(actualInterrupted).as("Флаг прерывания нельзя терять.").isTrue();
        releaseDelegate.countDown();
        busy.get(5, TimeUnit.SECONDS);
    }

    @Test
    void passes_upgrade_decision_through_from_delegate() {
        PasswordEncoder upgradingDelegate = new PasswordEncoder() {
            @Override
            public String encode(CharSequence rawPassword) {
                return "new:" + rawPassword;
            }

            @Override
            public boolean matches(CharSequence rawPassword, String encodedPassword) {
                return true;
            }

            @Override
            public boolean upgradeEncoding(String encodedPassword) {
                return encodedPassword.startsWith("old:");
            }
        };
        PasswordEncoder limited = new ConcurrencyLimitedPasswordEncoder(upgradingDelegate, 1, Duration.ofMillis(100));

        assertThat(limited.upgradeEncoding("old:hash")).isTrue();
        assertThat(limited.upgradeEncoding("new:hash")).isFalse();
    }

    private void await(CountDownLatch latch) {
        try {
            latch.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
