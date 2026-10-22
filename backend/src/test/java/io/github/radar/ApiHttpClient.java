package io.github.radar;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Arrays;

/**
 * HTTP-клиент тестов для запущенного на случайном порту API. Cookie передаются вручную:
 * стандартные хранилища cookie не отправляют Secure-cookie по http.
 */
public final class ApiHttpClient {
    private final HttpClient httpClient = HttpClient.newHttpClient();

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
