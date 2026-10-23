package io.github.radar.exception;

import io.github.radar.dto.ProblemDetailsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Ошибки компаний, членства, заявок и участников.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class CompanyProblemHandler {
    private final ProblemResponses problemResponses;

    /**
     * Отвечает 409, если пользователь уже состоит в компании.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(AlreadyCompanyMemberException.class)
    public ResponseEntity<ProblemDetailsResponse> handleAlreadyMember(
            AlreadyCompanyMemberException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/already-company-member",
                "Вы уже состоите в компании",
                HttpStatus.CONFLICT.value(),
                "Чтобы перейти в другую компанию, сначала выйдите из текущей."
        ));
    }

    /**
     * Отвечает 404, если компании нет.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(CompanyNotFoundException.class)
    public ResponseEntity<ProblemDetailsResponse> handleCompanyNotFound(
            CompanyNotFoundException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/company-not-found",
                "Компания не найдена",
                HttpStatus.NOT_FOUND.value(),
                "Компании с таким ID нет."
        ));
    }

    /**
     * Отвечает 403, если пользователь не состоит в компании.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(CompanyMembershipRequiredException.class)
    public ResponseEntity<ProblemDetailsResponse> handleMembershipRequired(
            CompanyMembershipRequiredException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/company-membership-required",
                "Нет доступа к компании",
                HttpStatus.FORBIDDEN.value(),
                "Вы не состоите в этой компании. Подайте заявку на вступление."
        ));
    }

    /**
     * Отвечает 403, если действие доступно только владельцу.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(CompanyOwnerRequiredException.class)
    public ResponseEntity<ProblemDetailsResponse> handleOwnerRequired(
            CompanyOwnerRequiredException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/company-owner-required",
                "Нужны права владельца",
                HttpStatus.FORBIDDEN.value(),
                "Это действие доступно только владельцу компании."
        ));
    }
}
