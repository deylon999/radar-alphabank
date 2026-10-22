package io.github.radar.repository;

import io.github.radar.domain.Member;
import io.github.radar.domain.Membership;
import io.github.radar.domain.MembershipRole;
import io.github.radar.domain.Position;
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
 * Хранение членства пользователей в компаниях.
 *
 * <p>Одно членство на пользователя и один владелец на компанию обеспечивает схема,
 * поэтому одновременные запросы не нарушают эти правила.
 */
@Repository
@RequiredArgsConstructor
public class MembershipRepository {
    private static final String USER_ID = "userId";

    private static final String POSITION = "position";

    private static final String COMPANY_ID = "companyId";

    private static final RowMapper<Membership> MEMBERSHIP_ROW_MAPPER = (resultSet, rowNumber) -> {
        String position = resultSet.getString(POSITION);
        return new Membership(
                resultSet.getObject("user_id", UUID.class),
                resultSet.getString("company_id"),
                MembershipRole.valueOf(resultSet.getString("role").toUpperCase(Locale.ROOT)),
                position == null ? null : Position.valueOf(position.toUpperCase(Locale.ROOT)),
                resultSet.getObject("joined_at", OffsetDateTime.class).toInstant()
        );
    };

    private static final RowMapper<Member> MEMBER_ROW_MAPPER = (resultSet, row) -> {
        String position = resultSet.getString(POSITION);
        return new Member(
                resultSet.getObject("user_id", UUID.class),
                resultSet.getString("email"),
                MembershipRole.valueOf(resultSet.getString("role").toUpperCase(Locale.ROOT)),
                position == null ? null : Position.valueOf(position.toUpperCase(Locale.ROOT)),
                resultSet.getObject("joined_at", OffsetDateTime.class).toInstant()
        );
    };

    private final JdbcClient jdbcClient;

    /**
     * Добавляет членство.
     *
     * @param membership членство
     * @throws org.springframework.dao.DuplicateKeyException если пользователь уже состоит
     *         в компании или у компании уже есть владелец
     */
    public void insert(Membership membership) {
        jdbcClient
                .sql(
                        """
                        INSERT INTO memberships (user_id, company_id, role, position, joined_at)
                        VALUES (:userId, :companyId, :role, :position, :joinedAt)
                        """
                )
                .param(USER_ID, membership.getUserId())
                .param(COMPANY_ID, membership.getCompanyId())
                .param("role", membership.getRole().code())
                .param(POSITION, membership.getPosition() == null
                        ? null : membership.getPosition().code())
                .param("joinedAt", OffsetDateTime.ofInstant(membership.getJoinedAt(), ZoneOffset.UTC))
                .update();
    }

    /**
     * Ищет членство пользователя.
     *
     * @param userId ID пользователя
     * @return членство или пустой результат
     */
    public Optional<Membership> findByUserId(UUID userId) {
        return jdbcClient
                .sql(
                        """
                        SELECT user_id, company_id, role, position, joined_at
                        FROM memberships
                        WHERE user_id = :userId
                        """
                )
                .param(USER_ID, userId)
                .query(MEMBERSHIP_ROW_MAPPER)
                .optional();
    }

    /**
     * Возвращает участников компании: первым владелец, остальные по времени вступления.
     *
     * @param companyId ID компании
     * @return участники
     */
    public List<Member> findMembers(String companyId) {
        return jdbcClient
                .sql(
                        """
                        SELECT m.user_id, u.email, m.role, m.position, m.joined_at
                        FROM memberships m
                        JOIN users u ON u.id = m.user_id
                        WHERE m.company_id = :companyId
                        ORDER BY m.role = 'owner' DESC, m.joined_at, m.user_id
                        """
                )
                .param(COMPANY_ID, companyId)
                .query(MEMBER_ROW_MAPPER)
                .list();
    }

    /**
     * Удаляет участника с ролью member. Владельца так удалить нельзя.
     *
     * @param companyId ID компании
     * @param userId ID участника
     * @return true, если участник с ролью member был удалён
     */
    public boolean deleteMember(String companyId, UUID userId) {
        return jdbcClient
                .sql(
                        """
                        DELETE FROM memberships
                        WHERE company_id = :companyId AND user_id = :userId AND role = 'member'
                        """
                )
                .param(COMPANY_ID, companyId)
                .param(USER_ID, userId)
                .update() == 1;
    }

    /**
     * Меняет должность пользователя в его компании. Роль не меняется.
     *
     * @param userId ID пользователя
     * @param position новая должность
     * @return true, если пользователь состоит в компании
     */
    public boolean updatePosition(UUID userId, Position position) {
        return jdbcClient
                .sql("UPDATE memberships SET position = :position WHERE user_id = :userId")
                .param(POSITION, position.code())
                .param(USER_ID, userId)
                .update() == 1;
    }

    /**
     * Делает владельца компании обычным участником.
     *
     * @param companyId ID компании
     * @param userId ID владельца
     * @return true, если пользователь был владельцем этой компании
     */
    public boolean demoteOwner(String companyId, UUID userId) {
        return changeRole(companyId, userId, MembershipRole.OWNER, MembershipRole.MEMBER);
    }

    /**
     * Делает участника компании владельцем.
     *
     * @param companyId ID компании
     * @param userId ID участника
     * @return true, если пользователь был участником этой компании с ролью member
     */
    public boolean promoteMember(String companyId, UUID userId) {
        return changeRole(companyId, userId, MembershipRole.MEMBER, MembershipRole.OWNER);
    }

    private boolean changeRole(String companyId, UUID userId, MembershipRole from, MembershipRole to) {
        return jdbcClient
                .sql(
                        """
                        UPDATE memberships SET role = :to
                        WHERE company_id = :companyId AND user_id = :userId AND role = :from
                        """
                )
                .param("to", to.code())
                .param(COMPANY_ID, companyId)
                .param(USER_ID, userId)
                .param("from", from.code())
                .update() == 1;
    }
}
