package io.github.radar.exception;

import io.github.radar.dto.ProblemDetailsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Ошибки участников компании.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class MemberProblemHandler {
    private final ProblemResponses problemResponses;

    /**
     * Отвечает 404, если пользователь не состоит в компании.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<ProblemDetailsResponse> handleMemberNotFound(
            MemberNotFoundException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/member-not-found",
                "Участник не найден",
                HttpStatus.NOT_FOUND.value(),
                "Пользователь не состоит в этой компании."
        ));
    }

    /**
     * Отвечает 409 на попытку владельца выйти из компании.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(OwnerCannotLeaveException.class)
    public ResponseEntity<ProblemDetailsResponse> handleOwnerCannotLeave(
            OwnerCannotLeaveException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/owner-cannot-leave",
                "Владелец не может выйти",
                HttpStatus.CONFLICT.value(),
                "Сначала передайте права владельца другому участнику."
        ));
    }

    /**
     * Отвечает 404, если у пользователя нет членства.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(MembershipNotFoundException.class)
    public ResponseEntity<ProblemDetailsResponse> handleMembershipNotFound(
            MembershipNotFoundException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/membership-not-found",
                "Вы не состоите в компании",
                HttpStatus.NOT_FOUND.value(),
                "Должность указывается после вступления в компанию."
        ));
    }
}
