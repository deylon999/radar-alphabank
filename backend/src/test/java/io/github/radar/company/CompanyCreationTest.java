package io.github.radar.company;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class CompanyCreationTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private JdbcClient jdbcClient;

    private ApiHttpClient client;

    private BrowserSession session;

    private String companyName;

    @BeforeEach
    void logIn() throws IOException, InterruptedException {
        client = new ApiHttpClient(port);
        session = client.registerAndLogin("ivan-" + UUID.randomUUID() + "@example.com", PASSWORD);
        companyName = "ООО «Логистика " + UUID.randomUUID() + "»";
    }

    @Test
    void creates_company_and_makes_creator_its_owner() throws Exception {
        HttpResponse<String> actualResponse = create(
                "{\"name\": \"" + companyName + "\", \"inn\": \"7707083893\", \"position\": \"ceo\"}");

        JsonNode actualCompany = jsonMapper.readTree(actualResponse.body());
        JsonNode actualMembership = me().get("membership");
        assertThat(actualResponse.statusCode()).isEqualTo(201);
        assertThat(UUID.fromString(actualCompany.get("id").asString())).isNotNull();
        assertThat(actualCompany.get("name").asString()).isEqualTo(companyName);
        assertThat(actualCompany.get("inn").asString()).isEqualTo("7707083893");
        assertThat(actualCompany.get("origin").asString()).isEqualTo("user");
        assertThat(actualMembership.get("company").get("id").asString()).isEqualTo(actualCompany.get("id").asString());
        assertThat(actualMembership.get("role").asString()).isEqualTo("owner");
        assertThat(actualMembership.get("position").asString()).isEqualTo("ceo");
        assertThat(actualMembership.get("joinedAt").asString()).isNotBlank();
    }

    @Test
    void omits_position_that_was_not_given() throws Exception {
        create("{\"name\": \"" + companyName + "\", \"inn\": \"7707083893\"}");

        assertThat(me().get("membership").has("position")).isFalse();
    }

    @Test
    void rejects_second_company_of_member_without_creating_it() throws Exception {
        create("{\"name\": \"" + companyName + "\", \"inn\": \"7707083893\"}");
        String secondName = companyName + " 2";

        HttpResponse<String> actualResponse = create("{\"name\": \"" + secondName + "\", \"inn\": \"7707083893\"}");

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(409);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/already-company-member");
        assertThat(actualBody.get("title").asString()).isEqualTo("Вы уже состоите в компании");
        assertThat(companiesNamed(secondName)).isZero();
    }

    @Test
    void creates_only_one_company_from_concurrent_requests() throws Exception {
        String body = "{\"name\": \"" + companyName + "\", \"inn\": \"7707083893\"}";

        List<Integer> actualStatuses = List.of(
                        CompletableFuture.supplyAsync(() -> createQuietly(body)),
                        CompletableFuture.supplyAsync(() -> createQuietly(body)))
                .stream()
                .map(CompletableFuture::join)
                .toList();

        assertThat(actualStatuses).containsExactlyInAnyOrder(201, 409);
        assertThat(companiesNamed(companyName)).isEqualTo(1);
    }

    @Test
    void rejects_unknown_position_as_invalid_enum_value() throws Exception {
        HttpResponse<String> actualResponse = create(
                "{\"name\": \"" + companyName + "\", \"inn\": \"7707083893\", \"position\": \"ceo1\"}");

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualBody.get("errors").get(0).get("field").asString()).isEqualTo("position");
        assertThat(actualBody.get("errors").get(0).get("title").asString()).isEqualTo("INVALID_ENUM_VALUE");
        assertThat(companiesNamed(companyName)).isZero();
    }

    @Test
    void rejects_invalid_inn_as_validation_problem() throws Exception {
        HttpResponse<String> actualResponse = create("{\"name\": \"" + companyName + "\", \"inn\": \"7707083894\"}");

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualBody.get("errors").get(0).get("title").asString()).isEqualTo("INVALID_CHECKSUM");
    }

    private HttpResponse<String> create(String json) throws IOException, InterruptedException {
        return client.postJson("/companies", json, session);
    }

    private int createQuietly(String json) {
        try {
            return create(json).statusCode();
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private JsonNode me() throws IOException, InterruptedException {
        return jsonMapper.readTree(client.send(session.apply(client.request("/me"))).body());
    }

    private int companiesNamed(String name) {
        return jdbcClient.sql("SELECT count(*) FROM companies WHERE name = :name")
                .param("name", name).query(Integer.class).single();
    }
}
