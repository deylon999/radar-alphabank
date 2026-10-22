package io.github.radar.controller;

import io.github.radar.dto.MembersResponse;
import io.github.radar.service.MemberService;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Участники компании.
 */
@RestController
@RequestMapping("/companies/{companyId}/members")
@RequiredArgsConstructor
public class MemberController {
    private final MemberService memberService;

    /**
     * Возвращает участников компании.
     *
     * @param companyId ID компании
     * @param user вошедший пользователь
     * @return участники
     */
    @GetMapping
    public MembersResponse list(@PathVariable String companyId, Principal user) {
        return memberService.list(companyId, user);
    }

    /**
     * Исключает участника или выходит из компании.
     *
     * @param companyId ID компании
     * @param userId ID исключаемого пользователя или свой ID
     * @param user вошедший пользователь
     */
    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable String companyId, @PathVariable UUID userId, Principal user) {
        memberService.remove(companyId, userId, user);
    }
}
