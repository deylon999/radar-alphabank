package io.github.radar.controller;

import io.github.radar.dto.JoinRequestResponse;
import io.github.radar.dto.JoinRequestsResponse;
import io.github.radar.dto.SubmitJoinRequest;
import io.github.radar.service.JoinRequestService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Заявки на вступление в компанию.
 */
@RestController
@RequestMapping("/companies/{companyId}/join-requests")
@RequiredArgsConstructor
public class JoinRequestController {
    private final JoinRequestService joinRequestService;

    /**
     * Подаёт заявку на вступление.
     *
     * @param companyId ID компании
     * @param request должность и сообщение
     * @param user вошедший пользователь
     * @return созданная заявка
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JoinRequestResponse submit(
            @PathVariable String companyId,
            @Valid @RequestBody SubmitJoinRequest request,
            Principal user
    ) {
        return joinRequestService.submit(companyId, request, user);
    }

    /**
     * Возвращает владельцу ожидающие заявки.
     *
     * @param companyId ID компании
     * @param user вошедший пользователь
     * @return ожидающие заявки
     */
    @GetMapping
    public JoinRequestsResponse list(@PathVariable String companyId, Principal user) {
        return joinRequestService.listPending(companyId, user);
    }

    /**
     * Одобряет заявку.
     *
     * @param companyId ID компании
     * @param requestId ID заявки
     * @param user вошедший пользователь
     * @return одобренная заявка
     */
    @PostMapping("/{requestId}/approve")
    public JoinRequestResponse approve(
            @PathVariable String companyId,
            @PathVariable UUID requestId,
            Principal user
    ) {
        return joinRequestService.approve(companyId, requestId, user);
    }

    /**
     * Отклоняет заявку.
     *
     * @param companyId ID компании
     * @param requestId ID заявки
     * @param user вошедший пользователь
     * @return отклонённая заявка
     */
    @PostMapping("/{requestId}/reject")
    public JoinRequestResponse reject(
            @PathVariable String companyId,
            @PathVariable UUID requestId,
            Principal user
    ) {
        return joinRequestService.reject(companyId, requestId, user);
    }

    /**
     * Отменяет свою заявку.
     *
     * @param companyId ID компании
     * @param requestId ID заявки
     * @param user вошедший пользователь
     * @return отменённая заявка
     */
    @PostMapping("/{requestId}/cancel")
    public JoinRequestResponse cancel(
            @PathVariable String companyId,
            @PathVariable UUID requestId,
            Principal user
    ) {
        return joinRequestService.cancel(companyId, requestId, user);
    }
}
