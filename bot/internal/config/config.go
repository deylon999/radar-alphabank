package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"strings"
)

type Config struct {
	BotToken string
	SiteURL  string
	LogLevel slog.Level
	DevAddr  string
}

func Load() (Config, error) {
	cfg := Config{
		BotToken: os.Getenv("BOT_TOKEN"),
		SiteURL:  strings.TrimRight(getenv("SITE_URL", "http://localhost:5173"), "/"),
		DevAddr:  os.Getenv("DEV_ADDR"),
	}

	if cfg.BotToken == "" {
		return Config{}, errors.New("BOT_TOKEN is required")
	}
	if u, err := url.Parse(cfg.SiteURL); err != nil || u.Scheme == "" || u.Host == "" {
		return Config{}, fmt.Errorf("SITE_URL must be an absolute URL, got %q", cfg.SiteURL)
	}
	if err := cfg.LogLevel.UnmarshalText([]byte(getenv("LOG_LEVEL", "info"))); err != nil {
		return Config{}, fmt.Errorf("LOG_LEVEL: %w", err)
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
