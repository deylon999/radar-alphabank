package telegram

import (
	"context"
	"errors"
	"fmt"
	"html"
	"net/url"
	"time"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
	"github.com/deylon999/radar-alphabank/bot/internal/delivery"
)

var _ delivery.Sender = (*Sender)(nil)

const maxRetries = 3

type Sender struct {
	bot     *bot.Bot
	siteURL string
	buttons bool
	limit   *limiter
	sleep   func(context.Context, time.Duration) error
}

func NewSender(b *bot.Bot, siteURL string) *Sender {
	return &Sender{
		bot:     b,
		siteURL: siteURL,
		buttons: isPublicURL(siteURL),
		limit:   newLimiter(),
		sleep:   sleep,
	}
}

func (s *Sender) Send(ctx context.Context, d backend.Delivery) error {
	msg, err := s.compose(d)
	if err != nil {
		return err
	}

	params := &bot.SendMessageParams{
		ChatID:             d.ChatID,
		Text:               msg.text,
		ParseMode:          models.ParseModeHTML,
		LinkPreviewOptions: &models.LinkPreviewOptions{IsDisabled: bot.True()},
	}
	if s.buttons {
		params.ReplyMarkup = &models.InlineKeyboardMarkup{
			InlineKeyboard: [][]models.InlineKeyboardButton{{{Text: msg.linkLabel, URL: msg.linkURL}}},
		}
	} else {
		params.Text += "\n\n" + html.EscapeString(msg.linkURL)
	}

	for attempt := 0; ; attempt++ {
		if err := s.limit.wait(ctx, d.ChatID); err != nil {
			return err
		}

		_, err = s.bot.SendMessage(ctx, params)
		if errors.Is(err, bot.ErrorForbidden) {
			return fmt.Errorf("%w: %v", delivery.ErrBlocked, err)
		}

		delay, ok := retryDelay(err, attempt)
		if !ok || ctx.Err() != nil {
			return err
		}
		if err := s.sleep(ctx, delay); err != nil {
			return err
		}
	}
}

func retryDelay(err error, attempt int) (time.Duration, bool) {
	if err == nil || attempt >= maxRetries {
		return 0, false
	}

	var tooMany *bot.TooManyRequestsError
	if errors.As(err, &tooMany) {
		return max(time.Duration(tooMany.RetryAfter)*time.Second, time.Second), true
	}

	var migrate *bot.MigrateError
	if errors.As(err, &migrate) {
		return 0, false
	}
	for _, permanent := range []error{bot.ErrorBadRequest, bot.ErrorUnauthorized, bot.ErrorNotFound, bot.ErrorConflict} {
		if errors.Is(err, permanent) {
			return 0, false
		}
	}

	return time.Second << attempt, true
}

func (s *Sender) compose(d backend.Delivery) (message, error) {
	switch {
	case d.Kind == backend.DeliveryUrgent && d.Insight != nil:
		return urgentMessage(s.siteURL, *d.Insight), nil
	case d.Kind == backend.DeliveryDigest && d.Digest != nil:
		return digestMessage(s.siteURL, *d.Digest), nil
	default:
		return message{}, fmt.Errorf("delivery %s: no payload for kind %q", d.ID, d.Kind)
	}
}

func isPublicURL(raw string) bool {
	u, err := url.Parse(raw)
	if err != nil {
		return false
	}
	switch u.Hostname() {
	case "", "localhost", "127.0.0.1", "::1":
		return false
	}
	return true
}
