package io.github.radar.company;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class CompanyAccessTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    private ApiHttpClient client;

    private BrowserSession owner;

    private String companyId;

    @BeforeEach
    void createCompany() throws IOException, InterruptedException {
        client = new ApiHttpClient(port);
        owner = client.registerAndLogin(newEmail(), PASSWORD);
        companyId = createCompanyAs(owner);
    }

    @Test
    void shows_profile_of_new_company_to_its_member() throws Exception {
        HttpResponse<String> actualResponse = getCompany(owner, companyId);

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualBody.get("id").asString()).isEqualTo(companyId);
        assertThat(actualBody.get("origin").asString()).isEqualTo("user");
        assertThat(actualBody.get("inn").asString()).isEqualTo("7707083893");
        assertThat(actualBody.get("description").asString()).isEmpty();
        assertThat(actualBody.get("facts")).isEmpty();
        assertThat(actualBody.get("analysis").get("status").asString()).isEqualTo("needs_context");
        assertThat(actualBody.has("profile")).as("Данных банка у созданной компании нет.").isFalse();
        assertThat(actualBody.has("industry")).isFalse();
    }

    @Test
    void forbids_profile_to_user_without_company() throws Exception {
        BrowserSession outsider = client.registerAndLogin(newEmail(), PASSWORD);

        HttpResponse<String> actualResponse = getCompany(outsider, companyId);

        assertMembershipRequired(actualResponse);
    }

    @Test
    void forbids_profile_to_member_of_other_company() throws Exception {
        BrowserSession otherOwner = client.registerAndLogin(newEmail(), PASSWORD);
        createCompanyAs(otherOwner);

        HttpResponse<String> actualResponse = getCompany(otherOwner, companyId);

        assertMembershipRequired(actualResponse);
    }

    @Test
    void reports_unknown_company_as_not_found() throws Exception {
        HttpResponse<String> actualResponse = getCompany(owner, "U_0");

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(404);
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/company-not-found");
        assertThat(actualBody.get("title").asString()).isEqualTo("Компания не найдена");
    }

    private void assertMembershipRequired(HttpResponse<String> actualResponse) {
        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(actualResponse.headers().firstValue("Content-Type")).hasValue("application/problem+json");
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/company-membership-required");
        assertThat(actualBody.get("title").asString()).isEqualTo("Нет доступа к компании");
        assertThat(actualBody.has("name")).as("Профиль не раскрывается.").isFalse();
    }

    private HttpResponse<String> getCompany(BrowserSession session, String id) throws IOException, InterruptedException {
        return client.send(session.apply(client.request("/companies/" + id)));
    }

    private String createCompanyAs(BrowserSession session) throws IOException, InterruptedException {
        HttpResponse<String> response = client.postJson("/companies",
                "{\"name\": \"ООО «Компания " + UUID.randomUUID() + "»\", \"inn\": \"7707083893\"}", session);
        return jsonMapper.readTree(response.body()).get("id").asString();
    }

    private String newEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }
}
