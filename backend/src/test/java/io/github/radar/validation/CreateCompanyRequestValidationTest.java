package io.github.radar.validation;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.dto.CreateCompanyRequest;
import io.github.radar.dto.ValidationIssueResponse;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CreateCompanyRequestValidationTest {
    private static final String NAME = "ООО «Тестовая логистика»";

    private static final String CHECKSUM_DESCRIPTION = "Проверьте ИНН: контрольная цифра не совпадает.";

    private final ValidationIssueFactory issueFactory = new ValidationIssueFactory();

    private ValidatorFactory validatorFactory;

    private Validator validator;

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
    void accepts_organization_inn_with_valid_checksum() {
        assertThat(issues(NAME, "7707083893")).isEmpty();
    }

    @Test
    void accepts_entrepreneur_inn_with_valid_checksums() {
        assertThat(issues(NAME, "500100732259")).isEmpty();
    }

    @Test
    void rejects_organization_inn_with_wrong_check_digit() {
        assertThat(issues(NAME, "7707083894"))
                .containsExactly(new ValidationIssueResponse("inn", "INVALID_CHECKSUM", CHECKSUM_DESCRIPTION));
    }

    @Test
    void rejects_entrepreneur_inn_with_wrong_eleventh_digit() {
        assertThat(issues(NAME, "500100732249"))
                .containsExactly(new ValidationIssueResponse("inn", "INVALID_CHECKSUM", CHECKSUM_DESCRIPTION));
    }

    @Test
    void rejects_entrepreneur_inn_with_wrong_twelfth_digit() {
        assertThat(issues(NAME, "500100732258"))
                .containsExactly(new ValidationIssueResponse("inn", "INVALID_CHECKSUM", CHECKSUM_DESCRIPTION));
    }

    @Test
    void rejects_inn_of_eleven_digits() {
        assertThat(issues(NAME, "77070838931"))
                .containsExactly(new ValidationIssueResponse("inn", "MUST_MATCH_PATTERN", "ИНН состоит из 10 или 12 цифр."));
    }

    @Test
    void requires_inn() {
        assertThat(issues(NAME, null))
                .containsExactly(new ValidationIssueResponse("inn", "REQUIRED", "Укажите ИНН."));
    }

    @Test
    void requires_name() {
        assertThat(issues(null, "7707083893"))
                .containsExactly(new ValidationIssueResponse("name", "REQUIRED", "Укажите наименование."));
    }

    @Test
    void rejects_empty_name() {
        assertThat(issues("", "7707083893"))
                .containsExactly(new ValidationIssueResponse("name", "MUST_NOT_BE_EMPTY", "Наименование не может быть пустым."));
    }

    @Test
    void accepts_name_of_500_characters() {
        assertThat(issues("Я".repeat(500), "7707083893")).isEmpty();
    }

    @Test
    void rejects_name_longer_than_500_characters() {
        assertThat(issues("Я".repeat(501), "7707083893"))
                .containsExactly(new ValidationIssueResponse(
                        "name", "OUT_OF_RANGE", "Наименование должно быть не длиннее 500 символов."));
    }

    private List<ValidationIssueResponse> issues(String name, String inn) {
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName(name);
        request.setInn(inn);
        return validator.validate(request).stream()
                .map(issueFactory::fromViolation)
                .sorted(issueFactory.order())
                .toList();
    }
}
