package io.github.radar.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Locale;
import org.junit.jupiter.api.Test;

class EmailTest {
    @Test
    void lowercases_mixed_case_address() {
        Email sut = new Email("Ivan@Example.COM");

        assertThat(sut.getValue()).isEqualTo("ivan@example.com");
    }

    @Test
    void keeps_lowercase_address_unchanged() {
        Email sut = new Email("ivan@example.com");

        assertThat(sut.getValue()).isEqualTo("ivan@example.com");
    }

    @Test
    void lowercases_regardless_of_default_locale() {
        Locale defaultLocale = Locale.getDefault();
        Locale.setDefault(Locale.forLanguageTag("tr-TR"));
        try {
            Email sut = new Email("IVAN@EXAMPLE.COM");

            assertThat(sut.getValue())
                    .as("В турецкой локали I становится ı без точки, а адрес должен совпасть с ivan@example.com.")
                    .isEqualTo("ivan@example.com");
        } finally {
            Locale.setDefault(defaultLocale);
        }
    }

    @Test
    void keeps_surrounding_whitespace_for_validation_to_reject() {
        Email sut = new Email(" ivan@example.com ");

        assertThat(sut.getValue()).isEqualTo(" ivan@example.com ");
    }
}
