package io.github.radar.repository;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Хеши резервных кодов. Коды существуют только при включённом TOTP-факторе: удаление
 * фактора удаляет и их.
 */
@Repository
@RequiredArgsConstructor
public class RecoveryCodeRepository {
    private static final String USER_ID = "userId";

    private static final String CODE_HASH = "codeHash";

    private final JdbcClient jdbcClient;

    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    /**
     * Заменяет набор кодов пользователя новым. Вызывается в транзакции сервиса.
     *
     * @param userId ID пользователя
     * @param codeHashes хеши новых кодов
     */
    public void replace(UUID userId, List<String> codeHashes) {
        jdbcClient.sql("DELETE FROM recovery_codes WHERE user_id = :userId")
                .param(USER_ID, userId)
                .update();
        namedParameterJdbcTemplate.batchUpdate(
                "INSERT INTO recovery_codes (user_id, code_hash) VALUES (:userId, :codeHash)",
                codeHashes.stream()
                        .map(hash -> new MapSqlParameterSource(USER_ID, userId)
                                .addValue(CODE_HASH, hash))
                        .toArray(SqlParameterSource[]::new));
    }

    /**
     * Погашает код: удаляет его, если он ещё есть. Из параллельных попыток с одним кодом
     * успешна только одна.
     *
     * @param userId ID пользователя
     * @param codeHash хеш кода
     * @return true, если код был и погашен этим вызовом
     */
    public boolean redeem(UUID userId, String codeHash) {
        return jdbcClient
                .sql("DELETE FROM recovery_codes WHERE user_id = :userId AND code_hash = :codeHash")
                .param(USER_ID, userId)
                .param(CODE_HASH, codeHash)
                .update() == 1;
    }
}
