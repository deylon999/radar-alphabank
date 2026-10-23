package io.github.radar.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.domain.Company;
import io.github.radar.domain.Email;
import io.github.radar.domain.Membership;
import io.github.radar.domain.MembershipRole;
import io.github.radar.domain.Position;
import io.github.radar.domain.User;
import io.github.radar.domain.UserProfile;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DuplicateKeyException;

@JdbcTest
@Import({PostgresContainerConfiguration.class, UserRepository.class, CompanyRepository.class, MembershipRepository.class,
        TotpFactorRepository.class})
class UserRepositoryTest {
    private static final String PASSWORD_HASH =
            "{argon2}$argon2id$v=19$m=16384,t=2,p=1$c29tZXNhbHQ$c29tZWhhc2hzb21laGFzaA";

    @Autowired
    private UserRepository sut;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private MembershipRepository membershipRepository;

    @Autowired
    private TotpFactorRepository totpFactorRepository;

    @Test
    void finds_created_user_by_email() {
        User createdUser = sut.insert(new Email("ivan@example.com"), PASSWORD_HASH);

        Optional<User> actualUser = sut.findByEmail(new Email("ivan@example.com"));

        assertThat(createdUser.getId()).isNotNull();
        assertThat(actualUser).hasValueSatisfying(user -> {
            assertThat(user.getId()).isEqualTo(createdUser.getId());
            assertThat(user.getEmail()).isEqualTo("ivan@example.com");
            assertThat(user.getPasswordHash()).isEqualTo(PASSWORD_HASH);
        });
    }

    @Test
    void finds_user_by_email_typed_in_other_letter_case() {
        User createdUser = sut.insert(new Email("Ivan@Example.com"), PASSWORD_HASH);

        Optional<User> actualUser = sut.findByEmail(new Email("ivan@EXAMPLE.com"));

        assertThat(actualUser).hasValueSatisfying(user -> assertThat(user.getId()).isEqualTo(createdUser.getId()));
    }

    @Test
    void assigns_distinct_ids_to_users() {
        User ivan = sut.insert(new Email("ivan@example.com"), PASSWORD_HASH);
        User maria = sut.insert(new Email("maria@example.com"), PASSWORD_HASH);

        assertThat(ivan.getId()).isNotEqualTo(maria.getId());
    }

    @Test
    void finds_nothing_for_unknown_email() {
        sut.insert(new Email("ivan@example.com"), PASSWORD_HASH);

        Optional<User> actualUser = sut.findByEmail(new Email("maria@example.com"));

        assertThat(actualUser).isEmpty();
    }

    @Test
    void rejects_duplicate_email() {
        sut.insert(new Email("ivan@example.com"), PASSWORD_HASH);

        assertThatThrownBy(() -> sut.insert(new Email("Ivan@Example.com"), PASSWORD_HASH))
                .as("Уникальность email должна обеспечивать схема, в том числе при одновременной регистрации.")
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void describes_user_without_company() {
        User user = sut.insert(new Email("ivan@example.com"), PASSWORD_HASH);

        Optional<UserProfile> actualProfile = sut.findProfile(user.getId());

        assertThat(actualProfile).hasValueSatisfying(profile -> {
            assertThat(profile.getUser().getEmail()).isEqualTo("ivan@example.com");
            assertThat(profile.getUser().isCanViewQualityMetrics()).isFalse();
            assertThat(profile.getMembership()).isEmpty();
            assertThat(profile.isTwoFactorEnabled()).isFalse();
        });
    }

    @Test
    void describes_member_with_company_and_position() {
        User user = sut.insert(new Email("ivan@example.com"), PASSWORD_HASH);
        Company company = companyRepository.insertUserCompany("ООО «Тестовая логистика»", "0012345673");
        Instant joinedAt = Instant.parse("2026-10-01T09:00:00Z");
        membershipRepository.insert(new Membership(user.getId(), company.getId(), MembershipRole.MEMBER, Position.CFO, joinedAt));

        Optional<UserProfile> actualProfile = sut.findProfile(user.getId());

        assertThat(actualProfile.flatMap(UserProfile::getMembership)).hasValueSatisfying(membership -> {
            assertThat(membership.getCompany().getId()).isEqualTo(company.getId());
            assertThat(membership.getCompany().getName()).isEqualTo("ООО «Тестовая логистика»");
            assertThat(membership.getCompany().getInn()).isEqualTo("0012345673");
            assertThat(membership.getMembership().getRole()).isEqualTo(MembershipRole.MEMBER);
            assertThat(membership.getMembership().getPosition()).isEqualTo(Position.CFO);
            assertThat(membership.getMembership().getJoinedAt()).isEqualTo(joinedAt);
        });
    }

    @Test
    void reports_enabled_two_factor_in_profile() {
        User user = sut.insert(new Email("ivan@example.com"), PASSWORD_HASH);
        totpFactorRepository.insert(user.getId(), new byte[] {1}, 1, Instant.now());

        Optional<UserProfile> actualProfile = sut.findProfile(user.getId());

        assertThat(actualProfile).hasValueSatisfying(profile -> assertThat(profile.isTwoFactorEnabled()).isTrue());
    }

    @Test
    void finds_no_profile_for_unknown_user() {
        assertThat(sut.findProfile(UUID.randomUUID())).isEmpty();
    }
}
