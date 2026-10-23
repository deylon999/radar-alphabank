package io.github.radar.exception;

import io.github.radar.dto.ProblemDetailsResponse;
import io.github.radar.dto.ValidationIssueResponse;
import io.github.radar.dto.ValidationProblemResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Собирает ответы Problem Details с типом содержимого application/problem+json.
 */
@Component
public class ProblemResponses {
    /**
     * Создаёт ответ с описанием ошибки; статус берётся из описания.
     *
     * @param body описание ошибки
     * @return ответ
     */
    public ResponseEntity<ProblemDetailsResponse> problem(ProblemDetailsResponse body) {
        return ResponseEntity.status(body.getStatus())
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(body);
    }

    /**
     * Создаёт ответ 422. detail повторяет описание первой ошибки поля.
     *
     * @param issues ошибки полей, не пустой список
     * @return ответ
     */
    public ResponseEntity<ValidationProblemResponse> validationProblem(
            List<ValidationIssueResponse> issues
    ) {
        return ResponseEntity.unprocessableContent()
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(new ValidationProblemResponse(
                        "/problems/validation-failed",
                        "Ошибка валидации",
                        HttpStatus.UNPROCESSABLE_CONTENT.value(),
                        issues.getFirst().getDescription(),
                        issues
                ));
    }

    /**
     * Создаёт ответ 400 на некорректный JSON или параметр.
     *
     * @return ответ
     */
    public ResponseEntity<ProblemDetailsResponse> malformedRequest() {
        return problem(new ProblemDetailsResponse(
                "/problems/malformed-request",
                "Некорректный запрос",
                HttpStatus.BAD_REQUEST.value(),
                "В запросе некорректный JSON или параметр."
        ));
    }
}
