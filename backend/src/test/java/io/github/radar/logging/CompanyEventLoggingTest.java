package io.github.radar.logging;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.CompanyApi;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.io.IOException;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
@ExtendWith(OutputCaptureExtension.class)
class CompanyEventLoggingTest {
    @LocalServerPort
    private int port;

    private CompanyApi api;

    private BrowserSession owner;

    private String companyId;

    @BeforeEach
    void createCompany() throws IOException, InterruptedException {
        api = new CompanyApi(new ApiHttpClient(port));
        owner = api.newUser();
        companyId = api.createCompany(owner);
    }

    @Test
    void logs_company_creation(CapturedOutput output) {
        assertThat(securityLines(output, "Создана компания")).singleElement().asString().contains("INFO", companyId);
    }

    @Test
    void logs_submitted_and_approved_request(CapturedOutput output) throws Exception {
        BrowserSession applicant = api.newUser();
        String requestId = api.json(api.submit(applicant, companyId, "{\"message\": \"секретное сообщение\"}"))
                .get("id").asString();

        api.decide(owner, companyId, requestId, "approve");

        assertThat(securityLines(output, "Подана заявка")).singleElement().asString().contains(requestId, companyId);
        assertThat(securityLines(output, "approved")).singleElement().asString().contains(requestId, companyId);
        assertThat(output).as("Сообщение заявителя в журнал не попадает.").doesNotContain("секретное сообщение");
    }

    @Test
    void logs_member_removal(CapturedOutput output) throws Exception {
        BrowserSession member = api.newUser();
        api.join(owner, companyId, member, null);
        String memberId = api.userId(member);

        api.remove(owner, companyId, memberId);

        assertThat(securityLines(output, "исключён")).singleElement().asString().contains(companyId, memberId);
    }

    @Test
    void logs_denied_access_as_warning(CapturedOutput output) throws Exception {
        api.get(api.newUser(), "/companies/" + companyId);

        assertThat(securityLines(output, "Отказ в доступе к компании")).singleElement().asString()
                .contains("WARN", companyId, "CompanyMembershipRequiredException");
    }

    @Test
    void logs_owner_only_refusal_once(CapturedOutput output) throws Exception {
        BrowserSession member = api.newUser();
        api.join(owner, companyId, member, null);

        api.get(member, "/companies/" + companyId + "/join-requests");

        assertThat(securityLines(output, "Отказ в доступе к компании")).singleElement().asString()
                .contains("WARN", companyId, "CompanyOwnerRequiredException");
    }

    private Stream<String> securityLines(CapturedOutput output, String event) {
        return output.getOut().lines().filter(line -> line.contains("radar.security") && line.contains(event));
    }
}
