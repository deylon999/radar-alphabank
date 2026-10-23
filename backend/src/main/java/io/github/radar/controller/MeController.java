package io.github.radar.controller;

import io.github.radar.dto.MeResponse;
import io.github.radar.dto.MembershipResponse;
import io.github.radar.dto.UpdateMembershipRequest;
import io.github.radar.service.MeService;
import jakarta.validation.Valid;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Текущий пользователь.
 */
@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class MeController {
    private final MeService meService;

    /**
     * Возвращает пользователя, его членство, заявку и право на метрики качества.
     *
     * @param user вошедший пользователь
     * @return описание пользователя
     */
    @GetMapping
    public MeResponse getMe(Principal user) {
        return meService.describe(user);
    }

    /**
     * Меняет свою должность в компании.
     *
     * @param request новая должность
     * @param user вошедший пользователь
     * @return членство с новой должностью
     */
    @PatchMapping("/membership")
    public MembershipResponse updateMembership(
            @Valid @RequestBody UpdateMembershipRequest request,
            Principal user
    ) {
        return meService.updateMembership(request, user);
    }
}
