package telegram

import (
	"errors"
	"fmt"
	"testing"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

func TestStartPayload(t *testing.T) {
	tests := map[string]string{
		"/start":                   "",
		"/start Ab3xK9pQr2Zt":      "Ab3xK9pQr2Zt",
		"  /start   Ab3xK9pQr2Zt ": "Ab3xK9pQr2Zt",
		"/start@radar_bot code":    "code",
	}
	for text, want := range tests {
		if got := startPayload(text); got != want {
			t.Errorf("startPayload(%q) = %q, want %q", text, got, want)
		}
	}
}

func TestLinkReply(t *testing.T) {
	tests := []struct {
		err  error
		want string
	}{
		{nil, "Готово. Срочные инсайты будут приходить сюда"},
		{backend.ErrCodeExpired, "Ссылка устарела. Нажмите «Подключить Telegram» ещё раз"},
		{backend.ErrCodeUsed, "Эта ссылка уже использована"},
		{fmt.Errorf("confirm: %w", backend.ErrCodeNotFound), "Ссылка не подходит. Откройте её заново на сайте"},
		{errors.New("connection refused"), "Не получилось подключить уведомления. Попробуйте позже"},
	}
	for _, tt := range tests {
		if got := linkReply(tt.err); got != tt.want {
			t.Errorf("linkReply(%v) = %q, want %q", tt.err, got, tt.want)
		}
	}
}
