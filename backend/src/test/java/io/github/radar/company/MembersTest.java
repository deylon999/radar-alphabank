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
class MembersTest {
    @LocalServerPort
    private int port;

    private CompanyApi api;

    private BrowserSession owner;

    private String companyId;

    private BrowserSession member;

    @BeforeEach
    void createCompanyWithMember() throws IOException, InterruptedException {
        api = new CompanyApi(new ApiHttpClient(port));
        owner = api.newUser();
        companyId = api.createCompany(owner);
        member = api.newUser();
        api.join(owner, companyId, member, "cfo");
    }

    @Test
    void lists_owner_first_and_then_members_by_join_time() throws Exception {
        BrowserSession later = api.newUser();
        api.join(owner, companyId, later, null);
        api.submit(api.newUser(), companyId, "{}");

        HttpResponse<String> actualResponse = api.get(member, "/companies/" + companyId + "/members");

        JsonNode actualMembers = api.json(actualResponse).get("members");
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualMembers).as("Заявители, ещё не принятые в компанию, в список не входят.").hasSize(3);
        assertThat(actualMembers.get(0).get("userId").asString()).isEqualTo(api.userId(owner));
        assertThat(actualMembers.get(0).get("role").asString()).isEqualTo("owner");
        assertThat(actualMembers.get(1).get("userId").asString()).isEqualTo(api.userId(member));
        assertThat(actualMembers.get(1).get("position").asString()).isEqualTo("cfo");
        assertThat(actualMembers.get(1).get("email").asString()).startsWith("user-");
        assertThat(actualMembers.get(1).get("joinedAt").asString()).isNotBlank();
        assertThat(actualMembers.get(2).get("userId").asString()).isEqualTo(api.userId(later));
        assertThat(actualMembers.get(2).has("position")).isFalse();
    }

    @Test
    void hides_members_from_outsider() throws Exception {
        HttpResponse<String> actualResponse = api.get(api.newUser(), "/companies/" + companyId + "/members");

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-membership-required");
    }

    @Test
    void removes_member_whose_access_ends_with_next_request() throws Exception {
        HttpResponse<String> actualResponse = api.remove(owner, companyId, api.userId(member));

        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(actualResponse.body()).isEmpty();
        assertThat(api.get(member, "/companies/" + companyId).statusCode()).isEqualTo(403);
        assertThat(api.json(api.get(member, "/me")).get("membership").isNull())
                .as("Аккаунт и сессия сохраняются, пропадает только членство.")
                .isTrue();
    }

    @Test
    void lets_member_leave_by_own_id_and_create_company() throws Exception {
        HttpResponse<String> actualResponse = api.remove(member, companyId, api.userId(member));

        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(api.get(member, "/companies/" + companyId).statusCode()).isEqualTo(403);
        assertThat(api.createCompany(member)).isNotBlank();
    }

    @Test
    void keeps_owner_who_tries_to_leave() throws Exception {
        HttpResponse<String> actualResponse = api.remove(owner, companyId, api.userId(owner));

        JsonNode actualBody = api.json(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(409);
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/owner-cannot-leave");
        assertThat(actualBody.get("title").asString()).isEqualTo("Владелец не может выйти");
        assertThat(api.json(api.get(owner, "/me")).get("membership").get("role").asString()).isEqualTo("owner");
    }

    @Test
    void forbids_member_to_remove_other_member() throws Exception {
        BrowserSession other = api.newUser();
        api.join(owner, companyId, other, null);

        HttpResponse<String> actualResponse = api.remove(member, companyId, api.userId(other));

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-owner-required");
        assertThat(api.get(other, "/companies/" + companyId).statusCode()).isEqualTo(200);
    }

    @Test
    void reports_already_removed_member_as_not_found() throws Exception {
        String memberId = api.userId(member);
        api.remove(owner, companyId, memberId);

        HttpResponse<String> actualResponse = api.remove(owner, companyId, memberId);

        JsonNode actualBody = api.json(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(404);
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/member-not-found");
        assertThat(actualBody.get("title").asString()).isEqualTo("Участник не найден");
    }

    @Test
    void reports_member_of_other_company_as_not_found() throws Exception {
        BrowserSession otherOwner = api.newUser();
        String otherCompanyId = api.createCompany(otherOwner);

        HttpResponse<String> actualResponse = api.remove(owner, companyId, api.userId(otherOwner));

        assertThat(actualResponse.statusCode()).isEqualTo(404);
        assertThat(api.get(otherOwner, "/companies/" + otherCompanyId).statusCode())
                .as("Владелец чужой компании не затронут.")
                .isEqualTo(200);
    }

    @Test
    void forbids_outsider_to_remove_member() throws Exception {
        HttpResponse<String> actualResponse = api.remove(api.newUser(), companyId, api.userId(member));

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-membership-required");
        assertThat(api.get(member, "/companies/" + companyId).statusCode()).isEqualTo(200);
    }

    @Test
    void rejects_malformed_user_id() throws Exception {
        HttpResponse<String> actualResponse = api.remove(owner, companyId, "not-a-uuid");

        assertThat(actualResponse.statusCode()).isEqualTo(400);
        assertThat(api.get(member, "/companies/" + companyId).statusCode()).isEqualTo(200);
    }
}
