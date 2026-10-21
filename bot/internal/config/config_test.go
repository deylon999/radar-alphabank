package config

import (
	"log/slog"
	"testing"
)

func TestLoad(t *testing.T) {
	tests := []struct {
		name    string
		env     map[string]string
		want    Config
		wantErr bool
	}{
		{
			name: "defaults",
			env:  map[string]string{"BOT_TOKEN": "123:abc"},
			want: Config{BotToken: "123:abc", SiteURL: "http://localhost:5173", LogLevel: slog.LevelInfo},
		},
		{
			name: "all set, trailing slash trimmed",
			env: map[string]string{
				"BOT_TOKEN": "123:abc",
				"SITE_URL":  "https://radar.vercel.app/",
				"LOG_LEVEL": "debug",
				"DEV_ADDR":  "localhost:8081",
			},
			want: Config{
				BotToken: "123:abc",
				SiteURL:  "https://radar.vercel.app",
				LogLevel: slog.LevelDebug,
				DevAddr:  "localhost:8081",
			},
		},
		{name: "no token", env: map[string]string{}, wantErr: true},
		{name: "relative site url", env: map[string]string{"BOT_TOKEN": "x", "SITE_URL": "radar.app"}, wantErr: true},
		{name: "bad log level", env: map[string]string{"BOT_TOKEN": "x", "LOG_LEVEL": "loud"}, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, key := range []string{"BOT_TOKEN", "SITE_URL", "LOG_LEVEL", "DEV_ADDR"} {
				t.Setenv(key, tt.env[key])
			}

			got, err := Load()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Load() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("Load() = %+v, want %+v", got, tt.want)
			}
		})
	}
}
