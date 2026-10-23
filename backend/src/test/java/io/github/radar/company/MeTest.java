package io.github.radar.company;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.radar.ApiHttpClient;
import io.github.radar.BrowserSession;
import io.github.radar.PostgresContainerConfiguration;
import io.github.radar.RedisContainerConfiguration;
import java.net.http.HttpResponse;
import java.util.UUID;
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
class MeTest {
    private static final String PASSWORD = "My company has useful news";

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private JdbcClient jdbcClient;

    private ApiHttpClient client;

    private String email;

    @BeforeEach
    void prepare() {
        client = new ApiHttpClient(port);
        email = "ivan-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    void describes_user_without_company() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);

        HttpResponse<String> actualResponse = client.send(session.apply(client.request("/me")));

        JsonNode actualBody = jsonMapper.readTree(actualResponse.body());
        assertThat(actualResponse.statusCode()).isEqualTo(200);
        assertThat(actualResponse.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(UUID.fromString(actualBody.get("user").get("id").asString())).isNotNull();
        assertThat(actualBody.get("user").get("email").asString()).isEqualTo(email);
        assertThat(actualBody.get("user").get("twoFactorEnabled").asBoolean()).isFalse();
        assertThat(actualBody.get("membership").isNull()).as("Поле передаётся и равно null.").isTrue();
        assertThat(actualBody.get("joinRequest").isNull()).isTrue();
        assertThat(actualBody.get("canViewQualityMetrics").asBoolean()).isFalse();
    }

    @Test
    void reports_quality_metrics_permission_granted_by_seed_data() throws Exception {
        BrowserSession session = client.registerAndLogin(email, PASSWORD);
        jdbcClient.sql("UPDATE users SET can_view_quality_metrics = TRUE WHERE email = :email")
                .param("email", email).update();

        JsonNode actualBody = jsonMapper.readTree(client.send(session.apply(client.request("/me"))).body());

        assertThat(actualBody.get("canViewQualityMetrics").asBoolean())
                .as("Право читается при каждом запросе, повторный вход не нужен.")
                .isTrue();
    }
}
