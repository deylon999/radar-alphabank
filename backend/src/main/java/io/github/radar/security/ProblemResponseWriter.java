package io.github.radar.security;

import io.github.radar.dto.ProblemDetailsResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Записывает Problem Details в ответ фильтров безопасности, которые работают до Spring MVC.
 */
@Component
@RequiredArgsConstructor
public class ProblemResponseWriter {
    private final JsonMapper jsonMapper;

    /**
     * Устанавливает статус и тип содержимого и пишет тело ошибки.
     *
     * @param response ответ
     * @param problem описание ошибки
     * @throws IOException если тело не удалось записать
     */
    public void write(HttpServletResponse response, ProblemDetailsResponse problem)
            throws IOException {
        response.setStatus(problem.getStatus());
        response.setContentType("application/problem+json");
        response.getOutputStream().write(jsonMapper.writeValueAsBytes(problem));
    }
}
