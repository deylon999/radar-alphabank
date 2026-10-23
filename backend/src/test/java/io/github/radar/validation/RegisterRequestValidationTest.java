package io.github.radar.validation;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.dto.RegisterRequest;
import io.github.radar.dto.ValidationIssueResponse;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RegisterRequestValidationTest {
    private static final String VALID_EMAIL = "ivan@example.com";

    private static final String VALID_PASSWORD = "My company has useful news";

    private static final String LEAKED_PASSWORD_DESCRIPTION = "Этот пароль встречается в утечках. Выберите другой.";

    private ValidatorFactory validatorFactory;

    private Validator validator;

    private final ValidationIssueFactory sut = new ValidationIssueFactory();

    @BeforeEach
    void createValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterEach
    void closeValidator() {
        validatorFactory.close();
    }

    @Test
    void accepts_valid_email_and_password() {
        assertThat(issues(VALID_EMAIL, VALID_PASSWORD)).isEmpty();
    }

    @Test
    void requires_email() {
        assertThat(issues(null, VALID_PASSWORD))
                .containsExactly(issue("email", "REQUIRED", "Укажите email."));
    }

    @Test
    void rejects_empty_email() {
        assertThat(issues("", VALID_PASSWORD))
                .containsExactly(issue("email", "MUST_NOT_BE_EMPTY", "Email не может быть пустым."));
    }

    @Test
    void accepts_email_of_254_characters() {
        String email = "a".repeat(64) + "@" + ("b".repeat(63) + ".").repeat(2) + "c".repeat(61);

        assertThat(email).hasSize(254);
        assertThat(issues(email, VALID_PASSWORD)).isEmpty();
    }

    @Test
    void rejects_email_longer_than_254_characters() {
        String email = "a".repeat(64) + "@" + ("b".repeat(63) + ".").repeat(2) + "c".repeat(62);

        assertThat(issues(email, VALID_PASSWORD))
                .containsExactly(issue("email", "OUT_OF_RANGE", "Email должен быть не длиннее 254 символов."));
    }

    @Test
    void rejects_email_without_domain() {
        assertThat(issues("ivan@", VALID_PASSWORD))
                .containsExactly(issue("email", "INVALID_FORMAT", "Укажите корректный email."));
    }

    @Test
    void rejects_email_with_surrounding_spaces() {
        assertThat(issues(" ivan@example.com ", VALID_PASSWORD))
                .containsExactly(issue("email", "INVALID_FORMAT", "Укажите корректный email."));
    }

    @Test
    void requires_password() {
        assertThat(issues(VALID_EMAIL, null))
                .containsExactly(issue("password", "REQUIRED", "Укажите пароль."));
    }

    @Test
    void rejects_password_of_14_characters() {
        assertThat(issues(VALID_EMAIL, "q".repeat(13) + "!"))
                .containsExactly(issue("password", "OUT_OF_RANGE", "Пароль должен быть длиной от 15 до 255 символов."));
    }

    @Test
    void accepts_password_of_15_characters() {
        assertThat(issues(VALID_EMAIL, "Zebra lamp 1942")).isEmpty();
    }

    @Test
    void accepts_password_of_255_characters() {
        assertThat(issues(VALID_EMAIL, "Zebra lamp 1942 ".repeat(15) + "Zebra lamp 1942")).isEmpty();
    }

    @Test
    void rejects_password_of_256_characters() {
        assertThat(issues(VALID_EMAIL, "Zebra lamp 1942 ".repeat(16)))
                .containsExactly(issue("password", "OUT_OF_RANGE", "Пароль должен быть длиной от 15 до 255 символов."));
    }

    @Test
    void rejects_password_from_leaked_password_list() {
        assertThat(issues(VALID_EMAIL, "1q2w3e4r5t6y7u8i"))
                .containsExactly(issue("password", "COMPROMISED_PASSWORD", LEAKED_PASSWORD_DESCRIPTION));
    }

    @Test
    void rejects_leaked_password_written_in_other_letter_case() {
        assertThat(issues(VALID_EMAIL, "1Q2W3E4R5T6Y7U8I"))
                .containsExactly(issue("password", "COMPROMISED_PASSWORD", LEAKED_PASSWORD_DESCRIPTION));
    }

    @Test
    void reports_issues_sorted_by_field_name() {
        assertThat(issues(null, null)).extracting(ValidationIssueResponse::getField)
                .containsExactly("email", "password");
    }

    private List<ValidationIssueResponse> issues(String email, String password) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword(password);
        return validator.validate(request).stream()
                .map(sut::fromViolation)
                .sorted(sut.order())
                .toList();
    }

    private ValidationIssueResponse issue(String field, String title, String description) {
        return new ValidationIssueResponse(field, title, description);
    }
}
