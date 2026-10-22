package io.github.radar;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Arrays;
import tools.jackson.databind.json.JsonMapper;

/**
 * HTTP-клиент тестов для запущенного на случайном порту API. Cookie передаются вручную:
 * стандартные хранилища cookie не отправляют Secure-cookie по http.
 */
public final class ApiHttpClient {
    private final HttpClient httpClient = HttpClient.newHttpClient();

    private final JsonMapper jsonMapper = new JsonMapper();

    private final String baseUri;

    /**
     * Создаёт клиента для API под базовым путём /api.
     *
     * @param port порт сервера
     */
    public ApiHttpClient(int port) {
        this.baseUri = "http://localhost:" + port + "/api";
    }

    /**
     * Начинает запрос к пути API.
     *
     * @param path путь без /api
     * @return построитель запроса
     */
    public HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create(baseUri + path));
    }

    /**
     * Отправляет запрос и читает тело как строку.
     *
     * @param request построитель запроса
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> send(HttpRequest.Builder request) throws IOException, InterruptedException {
        return httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    /**
     * Открывает анонимную сессию и получает её CSRF-токен, как это делает фронтенд.
     *
     * @return cookie и токен сессии
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public BrowserSession openSession() throws IOException, InterruptedException {
        HttpResponse<String> response = send(request("/auth/csrf"));
        return new BrowserSession(
                sessionCookie(response),
                jsonMapper.readTree(response.body()).get("token").asString()
        );
    }

    /**
     * Получает CSRF-токен для уже существующей сессии, например после входа.
     *
     * @param cookie пара SESSION=значение
     * @return та же сессия с её актуальным токеном
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public BrowserSession continueSession(String cookie) throws IOException, InterruptedException {
        HttpResponse<String> response = send(request("/auth/csrf").header("Cookie", cookie));
        return new BrowserSession(cookie, jsonMapper.readTree(response.body()).get("token").asString());
    }

    /**
     * Отправляет JSON методом POST в рамках сессии браузера.
     *
     * @param path путь без /api
     * @param json тело запроса
     * @param session сессия с CSRF-токеном
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> postJson(String path, String json, BrowserSession session)
            throws IOException, InterruptedException {
        return send(session.apply(request(path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json)));
    }

    /**
     * Возвращает пару SESSION=значение из Set-Cookie ответа.
     *
     * @param response ответ с Set-Cookie
     * @return значение для заголовка Cookie
     */
    public String sessionCookie(HttpResponse<?> response) {
        String setCookie = response.headers().firstValue("Set-Cookie").orElseThrow();
        return Arrays.stream(setCookie.split(";"))
                .map(String::trim)
                .filter(attribute -> attribute.startsWith("SESSION="))
                .findFirst()
                .orElseThrow();
    }
}
