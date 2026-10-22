package io.github.radar.repository;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.domain.Company;
import io.github.radar.domain.CompanyAccess;
import io.github.radar.domain.Email;
import io.github.radar.domain.Membership;
import io.github.radar.domain.MembershipRole;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;

@JdbcTest
@Import({PostgresContainerConfiguration.class, UserRepository.class, CompanyRepository.class, MembershipRepository.class})
class CompanyRepositoryTest {
    private static final String PASSWORD_HASH = "{argon2}hash";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MembershipRepository membershipRepository;

    @Autowired
    private CompanyRepository sut;

    private Company company;

    private UUID userId;

    @BeforeEach
    void createCompanyAndUser() {
        company = sut.insertUserCompany("ООО «Тестовая логистика»", "0012345673");
        userId = userRepository.insert(new Email("ivan-" + UUID.randomUUID() + "@example.com"), PASSWORD_HASH).getId();
    }

    @Test
    void finds_no_access_to_unknown_company() {
        assertThat(sut.findAccess("unknown-company", userId)).isEmpty();
    }

    @Test
    void finds_company_without_membership_for_outsider() {
        Optional<CompanyAccess> actualAccess = sut.findAccess(company.getId(), userId);

        assertThat(actualAccess).hasValueSatisfying(access -> {
            assertThat(access.getCompany().getName()).isEqualTo("ООО «Тестовая логистика»");
            assertThat(access.isMember()).isFalse();
            assertThat(access.isOwner()).isFalse();
        });
    }

    @Test
    void finds_membership_of_ordinary_member() {
        membershipRepository.insert(new Membership(userId, company.getId(), MembershipRole.MEMBER, null, Instant.now()));

        Optional<CompanyAccess> actualAccess = sut.findAccess(company.getId(), userId);

        assertThat(actualAccess).hasValueSatisfying(access -> {
            assertThat(access.isMember()).isTrue();
            assertThat(access.isOwner()).isFalse();
        });
    }

    @Test
    void finds_ownership_of_owner() {
        membershipRepository.insert(new Membership(userId, company.getId(), MembershipRole.OWNER, null, Instant.now()));

        Optional<CompanyAccess> actualAccess = sut.findAccess(company.getId(), userId);

        assertThat(actualAccess).hasValueSatisfying(access -> {
            assertThat(access.isMember()).isTrue();
            assertThat(access.isOwner()).isTrue();
        });
    }

    @Test
    void ignores_membership_in_other_company() {
        Company other = sut.insertUserCompany("ООО «Другая компания»", null);
        membershipRepository.insert(new Membership(userId, other.getId(), MembershipRole.OWNER, null, Instant.now()));

        Optional<CompanyAccess> actualAccess = sut.findAccess(company.getId(), userId);

        assertThat(actualAccess).hasValueSatisfying(access -> assertThat(access.isMember()).isFalse());
    }
}
