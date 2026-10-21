package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnv(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	content := "\uFEFF# comment\n" +
		"BOT_TOKEN=123:abc\n" +
		"\n" +
		"SITE_URL = \"https://radar.example\"\n" +
		"export LOG_LEVEL=debug\n" +
		"DEV_ADDR=\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}

	t.Setenv("LOG_LEVEL", "warn")
	for _, key := range []string{"BOT_TOKEN", "SITE_URL", "DEV_ADDR"} {
		t.Setenv(key, "")
		os.Unsetenv(key)
	}

	if err := LoadDotEnv(path); err != nil {
		t.Fatal(err)
	}

	want := map[string]string{
		"BOT_TOKEN": "123:abc",
		"SITE_URL":  "https://radar.example",
		"LOG_LEVEL": "warn",
		"DEV_ADDR":  "",
	}
	for key, value := range want {
		if got := os.Getenv(key); got != value {
			t.Errorf("%s = %q, want %q", key, got, value)
		}
	}
}

func TestLoadDotEnvMissingFile(t *testing.T) {
	if err := LoadDotEnv(filepath.Join(t.TempDir(), ".env")); err != nil {
		t.Errorf("missing file should be ignored, got %v", err)
	}
}

func TestLoadDotEnvBadLine(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte("BOT_TOKEN\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := LoadDotEnv(path); err == nil {
		t.Error("want error for line without =")
	}
}
