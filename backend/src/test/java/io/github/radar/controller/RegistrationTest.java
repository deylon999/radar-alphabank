package io.github.radar.controller;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class RegistrationTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private ApiHttpClient client;

    private String email;

    @BeforeEach
    void prepare() {
        client = new ApiHttpClient(port);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    void creates_user_and_returns_its_id() throws Exception {
        HttpResponse<String> actualResponse = register(email, PASSWORD);

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(201);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValueSatisfying(
                contentType -> assertThat(contentType).startsWith("application/json"));
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(actualBody.propertyNames()).containsExactly("id");
        assertThat(UUID.fromString(actualBody.get("id").asString())).isEqualTo(storedUserId(email));
    }

    @Test
    void stores_argon2id_hash_instead_of_password() throws Exception {
        register(email, PASSWORD);

        String actualHash = jdbcClient.sql("SELECT password_hash FROM users WHERE email = :email")
                .param("email", email)
                .query(String.class)
                .single();

        assertThat(actualHash).startsWith("{argon2}$argon2id$").doesNotContain(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, actualHash)).isTrue();
    }

    @Test
    void stores_email_in_lowercase() throws Exception {
        register(email.toUpperCase(Locale.ROOT), PASSWORD);

        assertThat(storedUserId(email)).isNotNull();
    }

    @Test
    void does_not_log_user_in() throws Exception {
        BrowserSession session = client.openSession();

        client.postJson("/auth/register", registerJson(email, PASSWORD), session);
        HttpResponse<String> actualResponse = client.send(session.apply(client.request("/auth/logout"))
                .POST(HttpRequest.BodyPublishers.noBody()));

        assertThat(actualResponse.statusCode())
                .as("После регистрации сессия остаётся анонимной.")
                .isEqualTo(401);
    }

    @Test
    void rejects_email_registered_in_other_letter_case() throws Exception {
        register(email, PASSWORD);

        HttpResponse<String> actualResponse = register(email.toUpperCase(Locale.ROOT), PASSWORD);

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(409);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/email-already-exists");
        assertThat(actualBody.get("title").asString()).isEqualTo("Email уже занят");
        assertThat(actualBody.get("status").asInt()).isEqualTo(409);
        assertThat(usersWithEmail(email)).isEqualTo(1);
    }

    @Test
    void rejects_invalid_field_as_validation_problem_without_creating_user() throws Exception {
        int usersBefore = allUsers();

        HttpResponse<String> actualResponse = register("ivan@", PASSWORD);

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/validation-failed");
        assertThat(actualBody.get("title").asString()).isEqualTo("Ошибка валидации");
        assertThat(actualBody.get("status").asInt()).isEqualTo(422);
        assertThat(actualBody.get("detail").asString()).isEqualTo("Укажите корректный email.");
        assertThat(actualBody.get("errors")).hasSize(1);
        assertThat(actualBody.get("errors").get(0).get("field").asString()).isEqualTo("email");
        assertThat(actualBody.get("errors").get(0).get("title").asString()).isEqualTo("INVALID_FORMAT");
        assertThat(actualBody.get("errors").get(0).get("description").asString()).isEqualTo("Укажите корректный email.");
        assertThat(allUsers()).isEqualTo(usersBefore);
    }

    @Test
    void rejects_explicit_null_as_must_not_be_null() throws Exception {
        HttpResponse<String> actualResponse = client.postJson("/auth/register",
                "{\"email\": null, \"password\": \"" + PASSWORD + "\"}", client.openSession());

        assertSingleFieldIssue(actualResponse, "email", "MUST_NOT_BE_NULL");
    }

    @Test
    void rejects_number_instead_of_string_as_invalid_type() throws Exception {
        HttpResponse<String> actualResponse = client.postJson("/auth/register",
                "{\"email\": 42, \"password\": \"" + PASSWORD + "\"}", client.openSession());

        assertSingleFieldIssue(actualResponse, "email", "INVALID_TYPE");
    }

    @Test
    void rejects_malformed_json_as_bad_request() throws Exception {
        HttpResponse<String> actualResponse = client.postJson("/auth/register", "{\"email\": ", client.openSession());

        assertMalformedRequest(actualResponse);
    }

    @Test
    void rejects_array_instead_of_object_as_bad_request() throws Exception {
        HttpResponse<String> actualResponse = client.postJson("/auth/register", "[]", client.openSession());

        assertMalformedRequest(actualResponse);
    }

    private void assertSingleFieldIssue(HttpResponse<String> actualResponse, String field, String code) {
        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/validation-failed");
        assertThat(actualBody.get("errors")).hasSize(1);
        assertThat(actualBody.get("errors").get(0).get("field").asString()).isEqualTo(field);
        assertThat(actualBody.get("errors").get(0).get("title").asString()).isEqualTo(code);
        assertThat(actualBody.get("detail").asString())
                .isEqualTo(actualBody.get("errors").get(0).get("description").asString())
                .isNotBlank();
    }

    private void assertMalformedRequest(HttpResponse<String> actualResponse) {
        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(400);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/malformed-request");
        assertThat(actualBody.get("title").asString()).isEqualTo("Некорректный запрос");
        assertThat(actualBody.get("status").asInt()).isEqualTo(400);
    }

    private int allUsers() {
        return jdbcClient.sql("SELECT count(*) FROM users").query(Integer.class).single();
    }

    private HttpResponse<String> register(String userEmail, String password) throws IOException, InterruptedException {
        return client.postJson("/auth/register", registerJson(userEmail, password), client.openSession());
    }

    private String registerJson(String userEmail, String password) {
        return jsonMapper.writeValueAsString(Map.of("email", userEmail, "password", password));
    }

    private UUID storedUserId(String userEmail) {
        return jdbcClient.sql("SELECT id FROM users WHERE email = :email")
                .param("email", userEmail)
                .query(UUID.class)
                .single();
    }

    private int usersWithEmail(String userEmail) {
        return jdbcClient.sql("SELECT count(*) FROM users WHERE email = :email")
                .param("email", userEmail)
                .query(Integer.class)
                .single();
    }
}
