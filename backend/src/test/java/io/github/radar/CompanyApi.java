package io.github.radar;

import java.io.IOException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Вызовы API компаний, заявок и участников для тестов.
 */
public final class CompanyApi {
    private static final String PASSWORD = "My company has useful news";

    private final ApiHttpClient client;

    private final JsonMapper jsonMapper = new JsonMapper();

    /**
     * Создаёт помощника поверх HTTP-клиента.
     *
     * @param client HTTP-клиент
     */
    public CompanyApi(ApiHttpClient client) {
        this.client = client;
    }

    /**
     * Регистрирует нового пользователя и входит.
     *
     * @return вошедшая сессия
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public BrowserSession newUser() throws IOException, InterruptedException {
        return client.registerAndLogin("user-" + UUID.randomUUID() + "@example.com", PASSWORD);
    }

    /**
     * Создаёт компанию от имени пользователя.
     *
     * @param session сессия будущего владельца
     * @return ID компании
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public String createCompany(BrowserSession session) throws IOException, InterruptedException {
        HttpResponse<String> response = client.postJson("/companies",
                "{\"name\": \"ООО «Компания " + UUID.randomUUID() + "»\", \"inn\": \"7707083893\"}", session);
        return json(response).get("id").asString();
    }

    /**
     * Подаёт заявку на вступление.
     *
     * @param session сессия заявителя
     * @param companyId ID компании
     * @param body тело заявки
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> submit(BrowserSession session, String companyId, String body)
            throws IOException, InterruptedException {
        return client.postJson("/companies/" + companyId + "/join-requests", body, session);
    }

    /**
     * Принимает решение по заявке: approve, reject или cancel.
     *
     * @param session сессия
     * @param companyId ID компании
     * @param requestId ID заявки
     * @param decision approve, reject или cancel
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> decide(BrowserSession session, String companyId, String requestId, String decision)
            throws IOException, InterruptedException {
        return client.send(session.apply(client.request(
                        "/companies/" + companyId + "/join-requests/" + requestId + "/" + decision))
                .POST(HttpRequest.BodyPublishers.noBody()));
    }

    /**
     * Подаёт заявку и одобряет её от имени владельца: пользователь становится участником.
     *
     * @param owner сессия владельца
     * @param companyId ID компании
     * @param member сессия будущего участника
     * @param position должность в формате JSON-значения или null
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public void join(BrowserSession owner, String companyId, BrowserSession member, String position)
            throws IOException, InterruptedException {
        String body = position == null ? "{}" : "{\"position\": \"" + position + "\"}";
        String requestId = json(submit(member, companyId, body)).get("id").asString();
        decide(owner, companyId, requestId, "approve");
    }

    /**
     * Исключает участника или выходит из компании.
     *
     * @param session сессия
     * @param companyId ID компании
     * @param userId ID исключаемого пользователя
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> remove(BrowserSession session, String companyId, String userId)
            throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/companies/" + companyId + "/members/" + userId))
                .DELETE());
    }

    /**
     * Возвращает ID пользователя сессии.
     *
     * @param session сессия
     * @return ID пользователя
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public String userId(BrowserSession session) throws IOException, InterruptedException {
        return json(get(session, "/me")).get("user").get("id").asString();
    }

    /**
     * Меняет своё членство.
     *
     * @param session сессия
     * @param body тело запроса
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> patchMembership(BrowserSession session, String body)
            throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/me/membership"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(body)));
    }

    /**
     * Выполняет GET в рамках сессии.
     *
     * @param session сессия
     * @param path путь без /api
     * @return ответ
     * @throws IOException при ошибке соединения
     * @throws InterruptedException при прерывании потока
     */
    public HttpResponse<String> get(BrowserSession session, String path) throws IOException, InterruptedException {
        return client.send(session.apply(client.request(path)));
    }

    /**
     * Разбирает тело ответа.
     *
     * @param response ответ
     * @return JSON
     */
    public JsonNode json(HttpResponse<String> response) {
        return jsonMapper.readTree(response.body());
    }
}
