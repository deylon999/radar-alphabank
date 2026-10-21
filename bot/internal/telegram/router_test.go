package telegram

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

func newTestBot(t *testing.T) (*bot.Bot, *fakeTelegram) {
	t.Helper()

	tg, serverURL := newFakeTelegram(t)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	h := NewHandlers(backend.NewFake(time.Now), "https://radar.example", log)

	b := newBot(t, serverURL, bot.WithNotAsyncHandlers(), bot.WithDefaultHandler(h.Default))
	h.Register(b)
	return b, tg
}

func command(text string) *models.Update {
	cmd, _, _ := strings.Cut(text, " ")
	return &models.Update{Message: &models.Message{
		Chat:     models.Chat{ID: 42},
		From:     &models.User{ID: 42, Username: "demo_director"},
		Text:     text,
		Entities: []models.MessageEntity{{Type: models.MessageEntityTypeBotCommand, Offset: 0, Length: len(cmd)}},
	}}
}

func TestCommandsReachTheirHandlers(t *testing.T) {
	b, tg := newTestBot(t)
	ctx := context.Background()

	steps := []struct {
		text string
		want string
	}{
		{"/help", "Я присылаю срочные инсайты"},
		{"/status", "Чтобы получать уведомления"},
		{"/start valid-code", "Готово."},
		{"/status", "Уведомления подключены: АО «Полевея Агро»"},
		{"/stop", "Уведомления отключены."},
		{"/start valid-code", "Эта ссылка уже использована"},
		{"/unknown", "Не понял команду."},
	}
	for _, s := range steps {
		b.ProcessUpdate(ctx, command(s.text))
		if got := tg.last(t).Get("text"); !strings.HasPrefix(got, s.want) {
			t.Errorf("%s: got %q, want prefix %q", s.text, got, s.want)
		}
	}
}
