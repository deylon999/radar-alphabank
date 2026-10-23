package io.github.radar.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Членство пользователя вместе с компанией, в которой он состоит.
 */
@Getter
@RequiredArgsConstructor
@ToString
public class CompanyMembership {
    private final Membership membership;

    private final Company company;
}
