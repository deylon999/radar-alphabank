package io.github.radar.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.domain.Company;
import io.github.radar.domain.CompanyOrigin;
import io.github.radar.domain.Email;
import io.github.radar.domain.Membership;
import io.github.radar.domain.MembershipRole;
import io.github.radar.domain.Position;
import io.github.radar.domain.User;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DuplicateKeyException;

@JdbcTest
@Import({PostgresContainerConfiguration.class, UserRepository.class, CompanyRepository.class, MembershipRepository.class})
class MembershipRepositoryTest {
    private static final String PASSWORD_HASH = "{argon2}$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA";

    private static final Instant JOINED_AT = Instant.parse("2026-10-01T09:00:00Z");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private MembershipRepository sut;

    private Company company;

    @BeforeEach
    void createCompany() {
        company = companyRepository.insertUserCompany("ООО «Тестовая логистика»", "0012345673");
    }

    @Test
    void finds_created_company_by_server_assigned_id() {
        Optional<Company> actualCompany = companyRepository.findById(company.getId());

        assertThat(UUID.fromString(company.getId())).isNotNull();
        assertThat(actualCompany).hasValueSatisfying(found -> {
            assertThat(found.getName()).isEqualTo("ООО «Тестовая логистика»");
            assertThat(found.getInn()).isEqualTo("0012345673");
            assertThat(found.getOrigin()).isEqualTo(CompanyOrigin.USER);
        });
    }

    @Test
    void finds_nothing_for_unknown_company() {
        assertThat(companyRepository.findById("U_0")).isEmpty();
    }

    @Test
    void finds_membership_of_user() {
        User owner = user();
        sut.insert(new Membership(owner.getId(), company.getId(), MembershipRole.OWNER, Position.CEO, JOINED_AT));

        Optional<Membership> actualMembership = sut.findByUserId(owner.getId());

        assertThat(actualMembership).hasValueSatisfying(membership -> {
            assertThat(membership.getCompanyId()).isEqualTo(company.getId());
            assertThat(membership.getRole()).isEqualTo(MembershipRole.OWNER);
            assertThat(membership.getPosition()).isEqualTo(Position.CEO);
            assertThat(membership.getJoinedAt()).isEqualTo(JOINED_AT.truncatedTo(ChronoUnit.MICROS));
        });
    }

    @Test
    void finds_no_membership_for_user_without_company() {
        assertThat(sut.findByUserId(user().getId())).isEmpty();
    }

    @Test
    void keeps_position_absent_when_not_given() {
        User member = user();
        sut.insert(new Membership(member.getId(), company.getId(), MembershipRole.MEMBER, null, JOINED_AT));

        assertThat(sut.findByUserId(member.getId())).hasValueSatisfying(
                membership -> assertThat(membership.getPosition()).isNull());
    }

    @Test
    void rejects_second_membership_of_same_user() {
        User member = user();
        Company other = companyRepository.insertUserCompany("ООО «Другая»", "0012345673");
        sut.insert(new Membership(member.getId(), company.getId(), MembershipRole.MEMBER, null, JOINED_AT));

        assertThatThrownBy(() -> sut.insert(new Membership(member.getId(), other.getId(), MembershipRole.OWNER, null, JOINED_AT)))
                .as("Пользователь состоит не больше чем в одной компании.")
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void rejects_second_owner_of_company() {
        sut.insert(new Membership(user().getId(), company.getId(), MembershipRole.OWNER, null, JOINED_AT));

        Membership secondOwner = new Membership(user().getId(), company.getId(), MembershipRole.OWNER, null, JOINED_AT);

        assertThatThrownBy(() -> sut.insert(secondOwner))
                .as("Владелец в компании ровно один.")
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void accepts_several_members_of_company() {
        sut.insert(new Membership(user().getId(), company.getId(), MembershipRole.OWNER, null, JOINED_AT));
        User first = user();
        User second = user();

        sut.insert(new Membership(first.getId(), company.getId(), MembershipRole.MEMBER, null, JOINED_AT));
        sut.insert(new Membership(second.getId(), company.getId(), MembershipRole.MEMBER, null, JOINED_AT));

        assertThat(sut.findByUserId(first.getId())).isPresent();
        assertThat(sut.findByUserId(second.getId())).isPresent();
    }

    private User user() {
        return userRepository.insert(new Email("user-" + UUID.randomUUID() + "@example.com"), PASSWORD_HASH);
    }
}
