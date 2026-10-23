package io.github.radar.company;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.CompanyApi;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class JoinRequestDecisionTest {
    @LocalServerPort
    private int port;

    private CompanyApi api;

    private BrowserSession owner;

    private String companyId;

    private BrowserSession applicant;

    private String requestId;

    @BeforeEach
    void submitRequest() throws IOException, InterruptedException {
        api = new CompanyApi(new ApiHttpClient(port));
        owner = api.newUser();
        companyId = api.createCompany(owner);
        applicant = api.newUser();
        requestId = api.json(api.submit(applicant, companyId, "{\"position\": \"accountant\"}")).get("id").asString();
    }

    @Test
    void lists_pending_requests_to_owner_oldest_first() throws Exception {
        String laterRequestId = api.json(api.submit(api.newUser(), companyId, "{}")).get("id").asString();

        HttpResponse<String> actualResponse = api.get(owner, "/companies/" + companyId + "/join-requests");

        JsonNode actualRequests = api.json(actualResponse).get("joinRequests");
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualRequests).hasSize(2);
        assertThat(actualRequests.get(0).get("id").asString()).isEqualTo(requestId);
        assertThat(actualRequests.get(1).get("id").asString()).isEqualTo(laterRequestId);
    }

    @Test
    void hides_requests_from_ordinary_member() throws Exception {
        approve(requestId);

        HttpResponse<String> actualResponse = api.get(applicant, "/companies/" + companyId + "/join-requests");

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-owner-required");
        assertThat(api.json(actualResponse).get("title").asString()).isEqualTo("Нужны права владельца");
    }

    @Test
    void hides_requests_from_outsider() throws Exception {
        HttpResponse<String> actualResponse = api.get(api.newUser(), "/companies/" + companyId + "/join-requests");

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-membership-required");
    }

    @Test
    void approves_request_and_grants_access_from_next_request() throws Exception {
        HttpResponse<String> actualResponse = approve(requestId);

        JsonNode actualMe = api.json(api.get(applicant, "/me"));
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(api.json(actualResponse).get("status").asString()).isEqualTo("approved");
        assertThat(api.json(actualResponse).get("decidedAt").asString()).isNotBlank();
        assertThat(api.get(applicant, "/companies/" + companyId).statusCode()).isEqualTo(200);
        assertThat(actualMe.get("membership").get("role").asString()).isEqualTo("member");
        assertThat(actualMe.get("membership").get("position").asString()).isEqualTo("accountant");
        assertThat(actualMe.get("joinRequest").isNull()).isTrue();
        assertThat(api.json(api.get(owner, "/companies/" + companyId + "/join-requests")).get("joinRequests")).isEmpty();
    }

    @Test
    void rejects_second_decision_on_same_request() throws Exception {
        approve(requestId);

        HttpResponse<String> actualResponse = api.decide(owner, companyId, requestId, "reject");

        assertThat(actualResponse.statusCode()).isEqualTo(409);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/join-request-not-pending");
        assertThat(api.get(applicant, "/companies/" + companyId).statusCode())
                .as("Одобренная заявка осталась одобренной.")
                .isEqualTo(200);
    }

    @Test
    void rejects_request_without_granting_access_and_allows_new_one() throws Exception {
        HttpResponse<String> actualResponse = api.decide(owner, companyId, requestId, "reject");

        assertThat(api.json(actualResponse).get("status").asString()).isEqualTo("rejected");
        assertThat(api.get(applicant, "/companies/" + companyId).statusCode()).isEqualTo(403);
        assertThat(api.json(api.get(applicant, "/me")).get("joinRequest").get("status").asString()).isEqualTo("rejected");
        assertThat(api.submit(applicant, companyId, "{}").statusCode()).isEqualTo(201);
    }

    @Test
    void forbids_decision_by_ordinary_member() throws Exception {
        BrowserSession member = api.newUser();
        approve(api.json(api.submit(member, companyId, "{}")).get("id").asString());

        HttpResponse<String> actualResponse = api.decide(member, companyId, requestId, "approve");

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-owner-required");
        assertThat(api.get(applicant, "/companies/" + companyId).statusCode()).isEqualTo(403);
    }

    @Test
    void hides_request_of_other_company_behind_not_found() throws Exception {
        BrowserSession otherOwner = api.newUser();
        String otherCompanyId = api.createCompany(otherOwner);

        HttpResponse<String> actualResponse = api.decide(otherOwner, otherCompanyId, requestId, "approve");

        assertThat(actualResponse.statusCode()).isEqualTo(404);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/join-request-not-found");
        assertThat(api.get(applicant, "/companies/" + otherCompanyId).statusCode()).isEqualTo(403);
    }

    @Test
    void lets_only_one_of_concurrent_decisions_win() throws Exception {
        List<Integer> actualStatuses = List.of(
                        CompletableFuture.supplyAsync(() -> decideQuietly("approve")),
                        CompletableFuture.supplyAsync(() -> decideQuietly("reject")))
                .stream()
                .map(CompletableFuture::join)
                .toList();

        int accessStatus = api.get(applicant, "/companies/" + companyId).statusCode();
        String finalStatus = api.json(api.get(applicant, "/me")).get("joinRequest").isNull() ? "approved" : "rejected";
        assertThat(actualStatuses).containsExactlyInAnyOrder(200, 409);
        assertThat(accessStatus).isEqualTo("approved".equals(finalStatus) ? 200 : 403);
    }

    @Test
    void cancels_own_request_and_allows_creating_company() throws Exception {
        HttpResponse<String> actualResponse = api.decide(applicant, companyId, requestId, "cancel");

        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(api.json(actualResponse).get("status").asString()).isEqualTo("cancelled");
        assertThat(api.json(api.get(applicant, "/me")).get("joinRequest").isNull())
                .as("Отменённые заявки не показываются.")
                .isTrue();
        assertThat(api.createCompany(applicant)).isNotBlank();
    }

    @Test
    void forbids_owner_to_cancel_request() throws Exception {
        HttpResponse<String> actualResponse = api.decide(owner, companyId, requestId, "cancel");

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/join-request-applicant-required");
    }

    @Test
    void hides_request_from_other_user_trying_to_cancel() throws Exception {
        HttpResponse<String> actualResponse = api.decide(api.newUser(), companyId, requestId, "cancel");

        assertThat(actualResponse.statusCode()).isEqualTo(404);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/join-request-not-found");
    }

    @Test
    void hides_request_from_owner_of_other_company_trying_to_cancel() throws Exception {
        BrowserSession otherOwner = api.newUser();
        api.createCompany(otherOwner);

        HttpResponse<String> actualResponse = api.decide(otherOwner, companyId, requestId, "cancel");

        assertThat(actualResponse.statusCode())
                .as("Владелец чужой компании не узнаёт о заявке.")
                .isEqualTo(404);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/join-request-not-found");
    }

    @Test
    void rejects_cancel_of_approved_request() throws Exception {
        approve(requestId);

        HttpResponse<String> actualResponse = api.decide(applicant, companyId, requestId, "cancel");

        assertThat(actualResponse.statusCode()).isEqualTo(409);
        assertThat(api.get(applicant, "/companies/" + companyId).statusCode()).isEqualTo(200);
    }

    private HttpResponse<String> approve(String id) throws IOException, InterruptedException {
        return api.decide(owner, companyId, id, "approve");
    }

    private int decideQuietly(String decision) {
        try {
            return api.decide(owner, companyId, requestId, decision).statusCode();
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
