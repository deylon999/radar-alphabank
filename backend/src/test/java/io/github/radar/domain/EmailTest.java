package io.github.radar.domain;

import static org.assertj.core.api.Assertions.assertThat;

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
    void keeps_surrounding_whitespace_for_validation_to_reject() {
        Email sut = new Email(" ivan@example.com ");

        assertThat(sut.getValue()).isEqualTo(" ivan@example.com ");
    }
}
