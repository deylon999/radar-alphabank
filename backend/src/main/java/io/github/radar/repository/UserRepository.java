package io.github.radar.repository;

import io.github.radar.domain.Company;
import io.github.radar.domain.CompanyMembership;
import io.github.radar.domain.CompanyOrigin;
import io.github.radar.domain.Email;
import io.github.radar.domain.Membership;
import io.github.radar.domain.MembershipRole;
import io.github.radar.domain.Position;
import io.github.radar.domain.User;
import io.github.radar.domain.UserProfile;
import java.time.OffsetDateTime;
import java.util.Locale;
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

    private static final RowMapper<UserProfile> PROFILE_ROW_MAPPER = (resultSet, rowNumber) -> {
        User user = USER_ROW_MAPPER.mapRow(resultSet, rowNumber);
        String companyId = resultSet.getString("company_id");
        CompanyMembership membership = null;
        if (companyId != null) {
            String position = resultSet.getString("position");
            membership = new CompanyMembership(
                    new Membership(
                            user.getId(),
                            companyId,
                            MembershipRole.valueOf(
                                    resultSet.getString("role").toUpperCase(Locale.ROOT)),
                            position == null
                                    ? null : Position.valueOf(position.toUpperCase(Locale.ROOT)),
                            resultSet.getObject("joined_at", OffsetDateTime.class).toInstant()),
                    new Company(
                            companyId,
                            resultSet.getString("company_name"),
                            resultSet.getString("company_inn"),
                            CompanyOrigin.valueOf(resultSet.getString("company_origin")
                                    .toUpperCase(Locale.ROOT))));
        }
        return new UserProfile(user, membership, resultSet.getBoolean("two_factor_enabled"));
    };

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

    /**
     * Заменяет хеш пароля пользователя.
     *
     * @param id ID пользователя
     * @param passwordHash новый хеш
     */
    public void updatePasswordHash(UUID id, String passwordHash) {
        jdbcClient.sql("UPDATE users SET password_hash = :passwordHash WHERE id = :id")
                .param("passwordHash", passwordHash)
                .param("id", id)
                .update();
    }

    /**
     * Читает пользователя с членством и признаком 2FA.
     *
     * @param id ID пользователя
     * @return профиль или пустой результат
     */
    public Optional<UserProfile> findProfile(UUID id) {
        return jdbcClient
                .sql(
                        """
                        SELECT u.id, u.email, u.password_hash, u.can_view_quality_metrics,
                               m.company_id, m.role, m.position, m.joined_at,
                               c.name AS company_name, c.inn AS company_inn,
                               c.origin AS company_origin,
                               EXISTS (SELECT 1 FROM totp_factors t WHERE t.user_id = u.id)
                                   AS two_factor_enabled
                        FROM users u
                        LEFT JOIN memberships m ON m.user_id = u.id
                        LEFT JOIN companies c ON c.id = m.company_id
                        WHERE u.id = :id
                        """
                )
                .param("id", id)
                .query(PROFILE_ROW_MAPPER)
                .optional();
    }
}
