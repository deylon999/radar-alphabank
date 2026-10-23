package io.github.radar.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Компания. ID непрозрачный: у компаний из данных банка — SYNTHETIC_U, у созданных — от сервера.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class Company {
    private final String id;

    private final String name;

    private final String inn;

    private final CompanyOrigin origin;
}
