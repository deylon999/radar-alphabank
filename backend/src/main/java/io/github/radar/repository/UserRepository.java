package io.github.radar.repository;

import io.github.radar.domain.Email;
import io.github.radar.domain.User;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Хранение пользователей.
 */
@Repository
@RequiredArgsConstructor
public class UserRepository {
    private static final RowMapper<User> USER_ROW_MAPPER = (resultSet, rowNumber) -> new User(
            resultSet.getObject("id", UUID.class),
            resultSet.getString("email"),
            resultSet.getString("password_hash"),
            resultSet.getBoolean("can_view_quality_metrics")
    );

    private final JdbcClient jdbcClient;

    /**
     * Создаёт пользователя с назначенным сервером id.
     *
     * @param email email пользователя
     * @param passwordHash хеш пароля
     * @return созданный пользователь
     */
    public User insert(Email email, String passwordHash) {
        return jdbcClient
                .sql(
                        """
                        INSERT INTO users (email, password_hash)
                        VALUES (:email, :passwordHash)
                        RETURNING id, email, password_hash, can_view_quality_metrics
                        """
                )
                .param("email", email.getValue())
                .param("passwordHash", passwordHash)
                .query(USER_ROW_MAPPER)
                .single();
    }

    /**
     * Ищет пользователя по email.
     *
     * @param email email пользователя
     * @return пользователь или пустой результат
     */
    public Optional<User> findByEmail(Email email) {
        return jdbcClient
                .sql(
                        """
                        SELECT id, email, password_hash, can_view_quality_metrics
                        FROM users
                        WHERE email = :email
                        """
                )
                .param("email", email.getValue())
                .query(USER_ROW_MAPPER)
                .optional();
    }

    /**
     * Ищет пользователя по ID.
     *
     * @param id ID пользователя
     * @return пользователь или пустой результат
     */
    public Optional<User> findById(UUID id) {
        return jdbcClient
                .sql(
                        """
                        SELECT id, email, password_hash, can_view_quality_metrics
                        FROM users
                        WHERE id = :id
                        """
                )
                .param("id", id)
                .query(USER_ROW_MAPPER)
                .optional();
    }
}
