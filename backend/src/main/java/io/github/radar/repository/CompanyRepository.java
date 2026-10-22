package io.github.radar.repository;

import io.github.radar.domain.Company;
import io.github.radar.domain.CompanyAccess;
import io.github.radar.domain.CompanyOrigin;
import io.github.radar.domain.MembershipRole;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Хранение компаний.
 */
@Repository
@RequiredArgsConstructor
public class CompanyRepository {
    private static final RowMapper<Company> COMPANY_ROW_MAPPER = (resultSet, row) -> new Company(
            resultSet.getString("id"),
            resultSet.getString("name"),
            resultSet.getString("inn"),
            CompanyOrigin.valueOf(resultSet.getString("origin").toUpperCase(Locale.ROOT))
    );

    private static final RowMapper<CompanyAccess> ACCESS_ROW_MAPPER = (resultSet, row) -> {
        String role = resultSet.getString("role");
        return new CompanyAccess(
                COMPANY_ROW_MAPPER.mapRow(resultSet, row),
                role == null ? null : MembershipRole.valueOf(role.toUpperCase(Locale.ROOT))
        );
    };

    private final JdbcClient jdbcClient;

    /**
     * Создаёт компанию пользователя с назначенным сервером ID.
     *
     * @param name наименование, указанное создателем
     * @param inn ИНН, указанный создателем
     * @return созданная компания
     */
    public Company insertUserCompany(String name, String inn) {
        return jdbcClient
                .sql(
                        """
                        INSERT INTO companies (name, inn, origin)
                        VALUES (:name, :inn, :origin)
                        RETURNING id, name, inn, origin
                        """
                )
                .param("name", name)
                .param("inn", inn)
                .param("origin", CompanyOrigin.USER.code())
                .query(COMPANY_ROW_MAPPER)
                .single();
    }

    /**
     * Ищет компанию по ID.
     *
     * @param id ID компании
     * @return компания или пустой результат
     */
    public Optional<Company> findById(String id) {
        return jdbcClient
                .sql(
                        """
                        SELECT id, name, inn, origin
                        FROM companies
                        WHERE id = :id
                        """
                )
                .param("id", id)
                .query(COMPANY_ROW_MAPPER)
                .optional();
    }

    /**
     * Ищет компанию вместе с ролью пользователя в ней.
     *
     * @param companyId ID компании
     * @param userId ID пользователя
     * @return компания и роль или пустой результат, если компании нет
     */
    public Optional<CompanyAccess> findAccess(String companyId, UUID userId) {
        return jdbcClient
                .sql(
                        """
                        SELECT c.id, c.name, c.inn, c.origin, m.role
                        FROM companies c
                        LEFT JOIN memberships m ON m.company_id = c.id AND m.user_id = :userId
                        WHERE c.id = :companyId
                        """
                )
                .param("companyId", companyId)
                .param("userId", userId)
                .query(ACCESS_ROW_MAPPER)
                .optional();
    }
}
