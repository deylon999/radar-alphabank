package io.github.radar.repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Включённые TOTP-факторы. У пользователя не больше одного фактора (первичный ключ).
 *
 * <p>Последний принятый временной шаг хранится вместе с фактором: код того же или более
 * раннего шага повторно не принимается, в том числе при параллельных запросах.
 */
@Repository
@RequiredArgsConstructor
public class TotpFactorRepository {
    private static final String USER_ID = "userId";

    private final JdbcClient jdbcClient;

    /**
     * Включает фактор, если у пользователя его ещё нет.
     *
     * @param userId ID пользователя
     * @param secretCiphertext зашифрованный секрет
     * @param acceptedStep шаг первого принятого кода
     * @param enabledAt время включения
     * @return true, если фактор включён этим вызовом
     */
    public boolean insert(UUID userId, byte[] secretCiphertext, long acceptedStep,
            Instant enabledAt) {
        return jdbcClient
                .sql(
                        """
                        INSERT INTO totp_factors (user_id, secret_ciphertext, last_used_step, enabled_at)
                        VALUES (:userId, :secretCiphertext, :acceptedStep, :enabledAt)
                        ON CONFLICT (user_id) DO NOTHING
                        """
                )
                .param(USER_ID, userId)
                .param("secretCiphertext", secretCiphertext)
                .param("acceptedStep", acceptedStep)
                .param("enabledAt", OffsetDateTime.ofInstant(enabledAt, ZoneOffset.UTC))
                .update() == 1;
    }

    /**
     * Возвращает зашифрованный секрет пользователя.
     *
     * @param userId ID пользователя
     * @return секрет или пустой результат, если 2FA не включена
     */
    public Optional<byte[]> findSecret(UUID userId) {
        return jdbcClient.sql("SELECT secret_ciphertext FROM totp_factors WHERE user_id = :userId")
                .param(USER_ID, userId)
                .query((resultSet, rowNumber) -> resultSet.getBytes("secret_ciphertext"))
                .optional();
    }

    /**
     * Проверяет, включена ли у пользователя 2FA.
     *
     * @param userId ID пользователя
     * @return true, если фактор есть
     */
    public boolean exists(UUID userId) {
        return jdbcClient
                .sql("SELECT EXISTS (SELECT 1 FROM totp_factors WHERE user_id = :userId)")
                .param(USER_ID, userId)
                .query(Boolean.class)
                .single();
    }

    /**
     * Отмечает шаг принятым, если он позже последнего принятого.
     *
     * @param userId ID пользователя
     * @param step временной шаг кода
     * @return true, если шаг ещё не использовался
     */
    public boolean acceptStep(UUID userId, long step) {
        return jdbcClient
                .sql(
                        """
                        UPDATE totp_factors SET last_used_step = :step
                        WHERE user_id = :userId AND last_used_step < :step
                        """
                )
                .param("step", step)
                .param(USER_ID, userId)
                .update() == 1;
    }

    /**
     * Удаляет фактор вместе с резервными кодами.
     *
     * @param userId ID пользователя
     */
    public void delete(UUID userId) {
        jdbcClient.sql("DELETE FROM totp_factors WHERE user_id = :userId")
                .param(USER_ID, userId)
                .update();
    }
}
