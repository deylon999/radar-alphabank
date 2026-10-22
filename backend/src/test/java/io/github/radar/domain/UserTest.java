package io.github.radar.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class UserTest {
    @Test
    void hides_password_hash_in_string_form() {
        User sut = new User(
                UUID.fromString("b95b680c-67b7-4d2e-bbd3-3b63d4cc7d61"),
                "ivan@example.com",
                "{argon2}$argon2id$v=19$m=16384,t=2,p=1$c29tZXNhbHQ$c29tZWhhc2hzb21laGFzaA"
        );

        String actualString = sut.toString();

        assertThat(actualString)
                .contains("ivan@example.com")
                .doesNotContain("argon2");
    }
}
