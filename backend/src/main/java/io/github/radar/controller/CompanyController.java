package io.github.radar.controller;

import io.github.radar.dto.CompanyResponse;
import io.github.radar.dto.CompanySummaryResponse;
import io.github.radar.dto.CreateCompanyRequest;
import io.github.radar.service.CompanyService;
import jakarta.validation.Valid;
import java.security.Principal;
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
 * Компании.
 */
@RestController
@RequestMapping("/companies")
@RequiredArgsConstructor
public class CompanyController {
    private final CompanyService companyService;

    /**
     * Создаёт компанию, создатель становится её владельцем.
     *
     * @param request наименование, ИНН и должность создателя
     * @param user вошедший пользователь
     * @return карточка созданной компании
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompanySummaryResponse createCompany(
            @Valid @RequestBody CreateCompanyRequest request,
            Principal user
    ) {
        return companyService.create(request, user);
    }

    /**
     * Возвращает профиль компании её участнику.
     *
     * @param companyId ID компании
     * @param user вошедший пользователь
     * @return профиль компании
     */
    @GetMapping("/{companyId}")
    public CompanyResponse getCompany(@PathVariable String companyId, Principal user) {
        return companyService.profile(companyId, user);
    }
}
