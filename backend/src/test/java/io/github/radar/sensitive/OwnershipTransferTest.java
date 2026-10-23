package io.github.radar.sensitive;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.CompanyApi;
import io.github.radar.MutableClock;
import io.github.radar.MutableClockConfiguration;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class, MutableClockConfiguration.class})
class OwnershipTransferTest {
    @LocalServerPort
    private int port;

    @Autowired
    private MutableClock clock;

    private CompanyApi api;

    private BrowserSession owner;

    private String companyId;

    private BrowserSession member;

    private String memberId;

    @BeforeEach
    void createCompanyWithMember() throws IOException, InterruptedException {
        clock.reset();
        api = new CompanyApi(new ApiHttpClient(port));
        owner = api.newUser();
        companyId = api.createCompany(owner);
        member = api.newUser();
        api.join(owner, companyId, member, "cfo");
        memberId = api.userId(member);
    }

    @Test
    void transfers_ownership_with_fresh_confirmation() throws Exception {
        api.reauthenticate(owner);

        HttpResponse<String> actualResponse = api.transfer(owner, companyId, memberId);

        JsonNode actualMembers = api.json(api.get(owner, "/companies/" + companyId + "/members")).get("members");
        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(api.role(member)).isEqualTo("owner");
        assertThat(api.role(owner)).isEqualTo("member");
        assertThat(actualMembers.get(0).get("userId").asString()).isEqualTo(memberId);
        assertThat(actualMembers.get(0).get("position").asString()).as("Должности не меняются.").isEqualTo("cfo");
        assertThat(api.get(owner, "/companies/" + companyId + "/join-requests").statusCode())
                .as("Бывший владелец теряет права со следующего запроса.")
                .isEqualTo(403);
    }

    @Test
    void requires_confirmation_of_identity() throws Exception {
        HttpResponse<String> actualResponse = api.transfer(owner, companyId, memberId);

        assertReauthenticationRequired(actualResponse);
    }

    @Test
    void accepts_confirmation_just_before_it_expires() throws Exception {
        api.reauthenticate(owner);
        clock.advance(Duration.ofMinutes(5).minusSeconds(1));

        assertThat(api.transfer(owner, companyId, memberId).statusCode()).isEqualTo(204);
    }

    @Test
    void rejects_confirmation_older_than_five_minutes() throws Exception {
        api.reauthenticate(owner);
        clock.advance(Duration.ofMinutes(5));

        assertReauthenticationRequired(api.transfer(owner, companyId, memberId));
    }

    @Test
    void ignores_confirmation_made_in_other_session() throws Exception {
        BrowserSession ownerElsewhere = new ApiHttpClient(port).login(emailOf(owner), "My company has useful news", Map.of());
        api.reauthenticate(ownerElsewhere);

        assertReauthenticationRequired(api.transfer(owner, companyId, memberId));
    }

    @Test
    void forbids_transfer_by_ordinary_member() throws Exception {
        api.reauthenticate(member);

        HttpResponse<String> actualResponse = api.transfer(member, companyId, memberId);

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-owner-required");
        assertThat(api.role(owner)).isEqualTo("owner");
    }

    @Test
    void reports_user_outside_company_as_not_found() throws Exception {
        BrowserSession outsider = api.newUser();
        api.reauthenticate(owner);

        HttpResponse<String> actualResponse = api.transfer(owner, companyId, api.userId(outsider));

        assertThat(actualResponse.statusCode()).isEqualTo(404);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/member-not-found");
        assertThat(api.role(owner)).as("Владелец остался владельцем.").isEqualTo("owner");
    }

    @Test
    void changes_nothing_when_owner_transfers_to_self() throws Exception {
        api.reauthenticate(owner);

        HttpResponse<String> actualResponse = api.transfer(owner, companyId, api.userId(owner));

        assertThat(actualResponse.statusCode()).isEqualTo(204);
        assertThat(api.role(owner)).isEqualTo("owner");
        assertThat(api.role(member)).isEqualTo("member");
    }

    @Test
    void forbids_repeated_transfer_by_former_owner() throws Exception {
        api.reauthenticate(owner);
        api.transfer(owner, companyId, memberId);

        HttpResponse<String> actualResponse = api.transfer(owner, companyId, memberId);

        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(api.json(actualResponse).get("type").asString()).isEqualTo("/problems/company-owner-required");
    }

    @Test
    void keeps_exactly_one_owner_after_concurrent_transfers() throws Exception {
        BrowserSession second = api.newUser();
        api.join(owner, companyId, second, null);
        String secondId = api.userId(second);
        api.reauthenticate(owner);

        List<Integer> actualStatuses = List.of(
                        CompletableFuture.supplyAsync(() -> transferQuietly(memberId)),
                        CompletableFuture.supplyAsync(() -> transferQuietly(secondId)))
                .stream()
                .map(CompletableFuture::join)
                .toList();

        JsonNode actualMembers = api.json(api.get(member, "/companies/" + companyId + "/members")).get("members");
        long owners = StreamSupport.stream(actualMembers.spliterator(), false)
                .filter(item -> "owner".equals(item.get("role").asString()))
                .count();
        assertThat(actualStatuses).containsExactlyInAnyOrder(204, 403);
        assertThat(owners).isEqualTo(1);
    }

    private void assertReauthenticationRequired(HttpResponse<String> actualResponse) throws IOException, InterruptedException {
        JsonNode actualBody = api.json(actualResponse);
        assertThat(actualResponse.statusCode()).isEqualTo(403);
        assertThat(actualBody.get("type").asString()).isEqualTo("/problems/reauthentication-required");
        assertThat(actualBody.get("title").asString()).isEqualTo("Нужно подтвердить личность");
        assertThat(api.role(owner)).isEqualTo("owner");
        assertThat(api.role(member)).isEqualTo("member");
    }

    private String emailOf(BrowserSession session) throws IOException, InterruptedException {
        return api.json(api.get(session, "/me")).get("user").get("email").asString();
    }

    private int transferQuietly(String userId) {
        try {
            return api.transfer(owner, companyId, userId).statusCode();
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
