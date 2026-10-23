package io.github.radar.service;

import io.github.radar.dto.CsrfResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Service;

/**
 * Выдача CSRF-токена текущей сессии.
 *
 * <p>Токен берётся из запроса, куда его кладёт фильтр Spring Security: там он замаскирован
 * для защиты от BREACH и меняется при каждой выдаче, оставаясь действительным для сессии.
 */
@Service
public class CsrfService {
    /**
     * Возвращает токен текущей сессии. Если сессии нет, Spring Security создаёт анонимную.
     *
     * @param request текущий запрос
     * @return токен и имя заголовка для изменяющих запросов
     */
    public CsrfResponse currentToken(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        return new CsrfResponse(csrfToken.getToken(), csrfToken.getHeaderName());
    }
}
