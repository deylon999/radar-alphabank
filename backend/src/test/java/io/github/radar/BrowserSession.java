package io.github.radar;

import java.net.http.HttpRequest;

/**
 * Cookie сессии и CSRF-токен, которые браузер передаёт в изменяющих запросах.
 */
public final class BrowserSession {
    private final String cookie;

    private final String csrfToken;

    BrowserSession(String cookie, String csrfToken) {
        this.cookie = cookie;
        this.csrfToken = csrfToken;
    }

    /**
     * Добавляет к запросу cookie сессии и CSRF-токен.
     *
     * @param request построитель запроса
     * @return тот же построитель
     */
    public HttpRequest.Builder apply(HttpRequest.Builder request) {
        return request.header("Cookie", cookie).header("X-CSRF-TOKEN", csrfToken);
    }

    /**
     * Возвращает пару SESSION=значение для заголовка Cookie.
     *
     * @return значение заголовка Cookie
     */
    public String cookieHeader() {
        return cookie;
    }

    /**
     * Создаёт сессию с другой cookie, но прежним CSRF-токеном.
     *
     * @param newCookie пара SESSION=значение
     * @return сессия с прежним токеном
     */
    public BrowserSession withCookie(String newCookie) {
        return new BrowserSession(newCookie, csrfToken);
    }
}
