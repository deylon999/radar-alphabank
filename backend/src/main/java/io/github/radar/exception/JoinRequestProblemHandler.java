package io.github.radar.exception;

import io.github.radar.dto.ProblemDetailsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Ошибки заявок на вступление.
 */
@RestControllerAdvice
@RequiredArgsConstructor
public class JoinRequestProblemHandler {
    private final ProblemResponses problemResponses;

    /**
     * Отвечает 409, если у пользователя есть заявка, ожидающая решения.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(JoinRequestPendingException.class)
    public ResponseEntity<ProblemDetailsResponse> handlePending(
            JoinRequestPendingException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/join-request-pending",
                "Заявка ожидает решения",
                HttpStatus.CONFLICT.value(),
                "У вас есть заявка на вступление, которая ещё не рассмотрена. Сначала отмените её."
        ));
    }

    /**
     * Отвечает 404, если заявки нет среди доступных пользователю.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(JoinRequestNotFoundException.class)
    public ResponseEntity<ProblemDetailsResponse> handleNotFound(
            JoinRequestNotFoundException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/join-request-not-found",
                "Заявка не найдена",
                HttpStatus.NOT_FOUND.value(),
                "Такой заявки нет среди доступных вам."
        ));
    }

    /**
     * Отвечает 409, если заявка уже рассмотрена.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(JoinRequestNotPendingException.class)
    public ResponseEntity<ProblemDetailsResponse> handleNotPending(
            JoinRequestNotPendingException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/join-request-not-pending",
                "Заявка уже рассмотрена",
                HttpStatus.CONFLICT.value(),
                "Заявка уже одобрена, отклонена или отменена. Обновите данные."
        ));
    }

    /**
     * Отвечает 403, если заявку пытается отменить не заявитель.
     *
     * @param exception исключение
     * @return описание ошибки
     */
    @ExceptionHandler(JoinRequestApplicantRequiredException.class)
    public ResponseEntity<ProblemDetailsResponse> handleApplicantRequired(
            JoinRequestApplicantRequiredException exception
    ) {
        return problemResponses.problem(new ProblemDetailsResponse(
                "/problems/join-request-applicant-required",
                "Отменить может только заявитель",
                HttpStatus.FORBIDDEN.value(),
                "Чтобы не принимать заявку, отклоните её."
        ));
    }
}
