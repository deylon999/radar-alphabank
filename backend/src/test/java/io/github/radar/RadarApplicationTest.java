package io.github.radar;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

@SpringBootTest
@Import({PostgresContainerConfiguration.class, RedisContainerConfiguration.class})
class RadarApplicationTest {
    @Autowired
    private JdbcClient jdbcClient;

    @Test
    void connects_to_postgresql_of_deployed_major_version() {
        String actualVersion = jdbcClient.sql("SHOW server_version").query(String.class).single();

        assertThat(actualVersion).startsWith("18.");
    }
}
