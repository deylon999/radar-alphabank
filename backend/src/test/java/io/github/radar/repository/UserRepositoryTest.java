package io.github.radar.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.domain.Email;
import io.github.radar.domain.User;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DuplicateKeyException;

@JdbcTest
@Import({PostgresContainerConfiguration.class, UserRepository.class})
class UserRepositoryTest {
    private static final String PASSWORD_HASH =
            "{argon2}$argon2id$v=19$m=16384,t=2,p=1$c29tZXNhbHQ$c29tZWhhc2hzb21laGFzaA";

    @Autowired
    private UserRepository sut;

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
}
