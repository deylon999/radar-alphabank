package io.github.radar.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UserAgentTest {
    @Test
    void recognizes_chrome_on_linux() {
        UserAgent sut = new UserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
                + "Chrome/141.0.0.0 Safari/537.36");

        assertThat(sut.browser()).hasValue("Chrome");
        assertThat(sut.operatingSystem()).hasValue("Linux");
    }

    @Test
    void recognizes_edge_on_windows_despite_chrome_token() {
        UserAgent sut = new UserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                + "Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0");

        assertThat(sut.browser()).hasValue("Edge");
        assertThat(sut.operatingSystem()).hasValue("Windows");
    }

    @Test
    void recognizes_yandex_browser_on_android_despite_linux_token() {
        UserAgent sut = new UserAgent("Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) "
                + "Chrome/138.0.0.0 YaBrowser/25.8.1.100 Mobile Safari/537.36");

        assertThat(sut.browser()).hasValue("Yandex Browser");
        assertThat(sut.operatingSystem()).hasValue("Android");
    }

    @Test
    void recognizes_safari_on_ios_despite_mac_os_token() {
        UserAgent sut = new UserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 "
                + "(KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1");

        assertThat(sut.browser()).hasValue("Safari");
        assertThat(sut.operatingSystem()).hasValue("iOS");
    }

    @Test
    void recognizes_firefox_on_macos() {
        UserAgent sut = new UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 15.6; rv:143.0) Gecko/20100101 Firefox/143.0");

        assertThat(sut.browser()).hasValue("Firefox");
        assertThat(sut.operatingSystem()).hasValue("macOS");
    }

    @Test
    void recognizes_nothing_in_unknown_client() {
        UserAgent sut = new UserAgent("curl/8.18.0");

        assertThat(sut.browser()).isEmpty();
        assertThat(sut.operatingSystem()).isEmpty();
    }

    @Test
    void recognizes_nothing_without_header() {
        UserAgent sut = new UserAgent(null);

        assertThat(sut.browser()).isEmpty();
        assertThat(sut.operatingSystem()).isEmpty();
    }
}
