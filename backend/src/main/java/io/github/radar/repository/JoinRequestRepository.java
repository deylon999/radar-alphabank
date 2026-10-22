package io.github.radar.repository;

import io.github.radar.domain.JoinRequest;
import io.github.radar.domain.JoinRequestStatus;
import io.github.radar.domain.Position;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Хранение заявок на вступление.
 *
 * <p>Не больше одной ожидающей заявки на пользователя обеспечивает схема. Решение по заявке —
 * условное обновление ожидающей заявки, поэтому из одновременных решений выигрывает одно.
 */
@Repository
@RequiredArgsConstructor
public class JoinRequestRepository {
    private static final String APPLICANT_ID = "applicantId";

    private static final String SELECT =
            """
            SELECT jr.id, jr.company_id, jr.applicant_id, u.email AS applicant_email, jr.status,
                   jr.position, jr.message, jr.created_at, jr.decided_at
            FROM join_requests jr
            JOIN users u ON u.id = jr.applicant_id
            """;

    private static final RowMapper<JoinRequest> JOIN_REQUEST_ROW_MAPPER = (resultSet, row) -> {
        String position = resultSet.getString("position");
        OffsetDateTime decidedAt = resultSet.getObject("decided_at", OffsetDateTime.class);
        return new JoinRequest(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("company_id"),
                resultSet.getObject("applicant_id", UUID.class),
                resultSet.getString("applicant_email"),
                JoinRequestStatus.valueOf(resultSet.getString("status").toUpperCase(Locale.ROOT)),
                position == null ? null : Position.valueOf(position.toUpperCase(Locale.ROOT)),
                resultSet.getString("message"),
                resultSet.getObject("created_at", OffsetDateTime.class).toInstant(),
                decidedAt == null ? null : decidedAt.toInstant()
        );
    };

    private final JdbcClient jdbcClient;

    /**
     * Создаёт ожидающую заявку.
     *
     * @param companyId ID компании
     * @param applicantId ID заявителя
     * @param position должность заявителя или null
     * @param message сообщение владельцу или null
     * @param createdAt время подачи
     * @return созданная заявка
     * @throws org.springframework.dao.DuplicateKeyException если у заявителя уже есть
     *         ожидающая заявка
     */
    public JoinRequest insertPending(String companyId, UUID applicantId, Position position,
            String message, Instant createdAt) {
        UUID id = jdbcClient
                .sql(
                        """
                        INSERT INTO join_requests
                            (company_id, applicant_id, status, position, message, created_at)
                        VALUES (:companyId, :applicantId, 'pending', :position, :message, :createdAt)
                        RETURNING id
                        """
                )
                .param("companyId", companyId)
                .param(APPLICANT_ID, applicantId)
                .param("position", position == null ? null : position.code())
                .param("message", message)
                .param("createdAt", OffsetDateTime.ofInstant(createdAt, ZoneOffset.UTC))
                .query(UUID.class)
                .single();
        return findById(id).orElseThrow();
    }

    /**
     * Ищет заявку по ID.
     *
     * @param id ID заявки
     * @return заявка или пустой результат
     */
    public Optional<JoinRequest> findById(UUID id) {
        return jdbcClient.sql(SELECT + "WHERE jr.id = :id")
                .param("id", id)
                .query(JOIN_REQUEST_ROW_MAPPER)
                .optional();
    }

    /**
     * Возвращает ожидающие заявки компании, начиная с самой старой.
     *
     * @param companyId ID компании
     * @return заявки или пустой список
     */
    public List<JoinRequest> findPendingByCompany(String companyId) {
        return jdbcClient
                .sql(SELECT + "WHERE jr.company_id = :companyId AND jr.status = 'pending' "
                        + "ORDER BY jr.created_at, jr.id")
                .param("companyId", companyId)
                .query(JOIN_REQUEST_ROW_MAPPER)
                .list();
    }

    /**
     * Ищет последнюю заявку пользователя.
     *
     * @param applicantId ID заявителя
     * @return последняя заявка или пустой результат
     */
    public Optional<JoinRequest> findLatestByApplicant(UUID applicantId) {
        return jdbcClient
                .sql(SELECT + "WHERE jr.applicant_id = :applicantId "
                        + "ORDER BY jr.created_at DESC, jr.id DESC LIMIT 1")
                .param(APPLICANT_ID, applicantId)
                .query(JOIN_REQUEST_ROW_MAPPER)
                .optional();
    }

    /**
     * Проверяет, есть ли у пользователя ожидающая заявка.
     *
     * @param applicantId ID пользователя
     * @return true, если заявка ждёт решения
     */
    public boolean hasPending(UUID applicantId) {
        return jdbcClient
                .sql(
                        """
                        SELECT EXISTS (
                            SELECT 1 FROM join_requests
                            WHERE applicant_id = :applicantId AND status = 'pending'
                        )
                        """
                )
                .param(APPLICANT_ID, applicantId)
                .query(Boolean.class)
                .single();
    }

    /**
     * Принимает решение владельца по ожидающей заявке компании.
     *
     * @param id ID заявки
     * @param companyId ID компании владельца
     * @param status approved или rejected
     * @param decidedAt время решения
     * @return true, если заявка ждала решения и решение принято
     */
    public boolean decideByOwner(UUID id, String companyId, JoinRequestStatus status,
            Instant decidedAt) {
        return jdbcClient
                .sql(
                        """
                        UPDATE join_requests
                        SET status = :status, decided_at = :decidedAt
                        WHERE id = :id AND company_id = :companyId AND status = 'pending'
                        """
                )
                .param("status", status.code())
                .param("decidedAt", OffsetDateTime.ofInstant(decidedAt, ZoneOffset.UTC))
                .param("id", id)
                .param("companyId", companyId)
                .update() == 1;
    }

    /**
     * Отменяет ожидающую заявку от имени заявителя.
     *
     * @param id ID заявки
     * @param applicantId ID заявителя
     * @param decidedAt время отмены
     * @return true, если заявка ждала решения и отменена
     */
    public boolean cancelByApplicant(UUID id, UUID applicantId, Instant decidedAt) {
        return jdbcClient
                .sql(
                        """
                        UPDATE join_requests
                        SET status = 'cancelled', decided_at = :decidedAt
                        WHERE id = :id AND applicant_id = :applicantId AND status = 'pending'
                        """
                )
                .param("decidedAt", OffsetDateTime.ofInstant(decidedAt, ZoneOffset.UTC))
                .param("id", id)
                .param(APPLICANT_ID, applicantId)
                .update() == 1;
    }
}
