package io.github.radar.company;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.CompanyApi;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class JoinRequestSubmissionTest {
    @LocalServerPort
    private int port;

    private CompanyApi api;

    private String companyId;

    private BrowserSession applicant;

    @BeforeEach
    void prepare() throws IOException, InterruptedException {
        api = new CompanyApi(new ApiHttpClient(port));
        companyId = api.createCompany(api.newUser());
        applicant = api.newUser();
    }

    @Test
    void creates_pending_request_with_applicant_details() throws Exception {
        HttpResponse<String> actualResponse = api.submit(applicant, companyId,
                "{\"position\": \"cfo\", \"message\": \"Я финансовый директор\"}");

        JsonNode actualBody = api.json(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(201);
        assertThat(UUID.fromString(actualBody.get("id").asString())).isNotNull();
        assertThat(actualBody.get("company").get("id").asString()).isEqualTo(companyId);
        assertThat(actualBody.get("applicant").get("email").asString()).startsWith("user-");
        assertThat(actualBody.get("status").asString()).isEqualTo("pending");
        assertThat(actualBody.get("position").asString()).isEqualTo("cfo");
        assertThat(actualBody.get("message").asString()).isEqualTo("Я финансовый директор");
        assertThat(actualBody.get("createdAt").asString()).isNotBlank();
        assertThat(actualBody.has("decidedAt")).as("Пока заявка ждёт решения, поля нет.").isFalse();
    }

    @Test
    void grants_no_access_while_request_is_pending() throws Exception {
        api.submit(applicant, companyId, "{}");

        HttpResponse<String> actualResponse = api.get(applicant, "/companies/" + companyId);

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-membership-required");
    }

    @Test
    void shows_pending_request_in_me() throws Exception {
        String requestId = api.json(api.submit(applicant, companyId, "{}")).get("id").asString();

        JsonNode actualMe = api.json(api.get(applicant, "/me"));

        assertThat(actualMe.get("membership").isNull()).isTrue();
        assertThat(actualMe.get("joinRequest").get("id").asString()).isEqualTo(requestId);
        assertThat(actualMe.get("joinRequest").get("status").asString()).isEqualTo("pending");
    }

    @Test
    void omits_position_and_message_that_were_not_given() throws Exception {
        JsonNode actualBody = api.json(api.submit(applicant, companyId, "{}"));

        assertThat(actualBody.has("position")).isFalse();
        assertThat(actualBody.has("message")).isFalse();
    }

    @Test
    void rejects_request_from_company_member() throws Exception {
        BrowserSession otherOwner = api.newUser();
        api.createCompany(otherOwner);

        HttpResponse<String> actualResponse = api.submit(otherOwner, companyId, "{}");

        assertThat(actualResponse.statusCode()).isEqualTo(409);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/already-company-member");
    }

    @Test
    void rejects_second_pending_request() throws Exception {
        String otherCompanyId = api.createCompany(api.newUser());
        api.submit(applicant, companyId, "{}");

        HttpResponse<String> actualResponse = api.submit(applicant, otherCompanyId, "{}");

        JsonNode actualBody = api.json(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(409);
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/join-request-pending");
        assertThat(actualBody.get("title").asString()).isEqualTo("Заявка ожидает решения");
    }

    @Test
    void blocks_company_creation_while_request_is_pending() throws Exception {
        api.submit(applicant, companyId, "{}");

        HttpResponse<String> actualResponse = new ApiHttpClient(port).postJson("/companies",
                "{\"name\": \"ООО «Своя»\", \"inn\": \"7707083893\"}", applicant);

        assertThat(actualResponse.statusCode()).isEqualTo(409);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/join-request-pending");
    }

    @Test
    void reports_unknown_company_as_not_found() throws Exception {
        HttpResponse<String> actualResponse = api.submit(applicant, "U_0", "{}");

        assertThat(actualResponse.statusCode()).isEqualTo(404);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-not-found");
    }

    @Test
    void rejects_empty_message_as_validation_problem() throws Exception {
        HttpResponse<String> actualResponse = api.submit(applicant, companyId, "{\"message\": \"\"}");

        JsonNode actualBody = api.json(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(422);
        assertThat(actualBody.get("errors").get(0).get("field").asString()).isEqualTo("message");
        assertThat(actualBody.get("errors").get(0).get("title").asString()).isEqualTo("MUST_NOT_BE_EMPTY");
    }

    @Test
    void rejects_message_longer_than_500_characters() throws Exception {
        HttpResponse<String> actualResponse = api.submit(applicant, companyId, "{\"message\": \"" + "я".repeat(501) + "\"}");

        assertThat(api.json(actualResponse).get("errors").get(0).get("title").asString()).isEqualTo("OUT_OF_RANGE");
    }
}
