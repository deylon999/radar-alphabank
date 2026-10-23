package io.github.radar.company;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.CompanyApi;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class MembershipUpdateTest {
    @LocalServerPort
    private int port;

    private CompanyApi api;

    private BrowserSession member;

    @BeforeEach
    void createMember() throws IOException, InterruptedException {
        api = new CompanyApi(new ApiHttpClient(port));
        BrowserSession owner = api.newUser();
        String companyId = api.createCompany(owner);
        member = api.newUser();
        api.join(owner, companyId, member, "cfo");
    }

    @Test
    void changes_own_position_without_changing_role() throws Exception {
        HttpResponse<String> actualResponse = api.patchMembership(member, "{\"position\": \"treasurer\"}");

        JsonNode actualBody = api.json(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualBody.get("position").asString()).isEqualTo("treasurer");
        assertThat(actualBody.get("role").asString()).isEqualTo("member");
        assertThat(actualBody.get("company").get("id").asString()).isNotBlank();
        assertThat(api.json(api.get(member, "/me")).get("membership").get("position").asString()).isEqualTo("treasurer");
    }

    @Test
    void ignores_role_sent_by_client() throws Exception {
        api.patchMembership(member, "{\"position\": \"ceo\", \"role\": \"owner\"}");

        assertThat(api.json(api.get(member, "/me")).get("membership").get("role").asString())
                .as("Роль доступа так не меняется.")
                .isEqualTo("member");
    }

    @Test
    void reports_missing_membership_as_not_found() throws Exception {
        HttpResponse<String> actualResponse = api.patchMembership(api.newUser(), "{\"position\": \"ceo\"}");

        JsonNode actualBody = api.json(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(404);
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/membership-not-found");
        assertThat(actualBody.get("title").asString()).isEqualTo("Вы не состоите в компании");
    }

    @Test
    void requires_position() throws Exception {
        assertFieldIssue(api.patchMembership(member, "{}"), "REQUIRED");
    }

    @Test
    void rejects_null_position() throws Exception {
        assertFieldIssue(api.patchMembership(member, "{\"position\": null}"), "MUST_NOT_BE_NULL");
    }

    @Test
    void rejects_unknown_position() throws Exception {
        assertFieldIssue(api.patchMembership(member, "{\"position\": \"director\"}"), "INVALID_ENUM_VALUE");
    }

    private void assertFieldIssue(HttpResponse<String> actualResponse, String code) throws IOException, InterruptedException {
        JsonNode actualBody = api.json(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualBody.get("errors").get(0).get("field").asString()).isEqualTo("position");
        assertThat(actualBody.get("errors").get(0).get("title").asString()).isEqualTo(code);
        assertThat(api.json(api.get(member, "/me")).get("membership").get("position").asString()).isEqualTo("cfo");
    }
}
