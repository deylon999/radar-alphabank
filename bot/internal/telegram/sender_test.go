package telegram

import (
	"context"
	"errors"
	"net/http"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
	"github.com/deylon999/radar-alphabank/bot/internal/delivery"
)

var (
	urgentDelivery = backend.Delivery{
		ID:      "d-1",
		ChatID:  42,
		Kind:    backend.DeliveryUrgent,
		Insight: &backend.Insight{ID: "agro-flood", Kind: "risk", Urgency: "urgent", Title: "Паводок"},
	}
	digestDelivery = backend.Delivery{
		ID:     "d-2",
		ChatID: 42,
		Kind:   backend.DeliveryDigest,
		Digest: &backend.Digest{Since: time.Date(2026, time.October, 11, 0, 0, 0, 0, time.UTC), Risks: 2},
	}
)

func TestSenderUsesButtonForPublicSite(t *testing.T) {
	tg, serverURL := newFakeTelegram(t)
	s := NewSender(newBot(t, serverURL), "https://radar.example")

	if err := s.Send(context.Background(), urgentDelivery); err != nil {
		t.Fatal(err)
	}

	got := tg.last(t)
	if got.Get("chat_id") != "42" || got.Get("parse_mode") != "HTML" {
		t.Errorf("chat_id = %q, parse_mode = %q", got.Get("chat_id"), got.Get("parse_mode"))
	}
	if !strings.Contains(got.Get("reply_markup"), `"url":"https://radar.example/insights/agro-flood"`) {
		t.Errorf("reply_markup = %s", got.Get("reply_markup"))
	}
}

func TestSenderPutsLinkInTextForLocalSite(t *testing.T) {
	tg, serverURL := newFakeTelegram(t)
	s := NewSender(newBot(t, serverURL), "http://localhost:5173")

	if err := s.Send(context.Background(), digestDelivery); err != nil {
		t.Fatal(err)
	}

	got := tg.last(t)
	if got.Get("reply_markup") != "" {
		t.Errorf("unexpected reply_markup %s", got.Get("reply_markup"))
	}
	if !strings.HasSuffix(got.Get("text"), "\n\nhttp://localhost:5173/") {
		t.Errorf("text = %q", got.Get("text"))
	}
}

func TestSenderReportsBlockedChat(t *testing.T) {
	tg, serverURL := newFakeTelegram(t)
	tg.errorCode = http.StatusForbidden
	s := NewSender(newBot(t, serverURL), "https://radar.example")

	err := s.Send(context.Background(), urgentDelivery)
	if !errors.Is(err, delivery.ErrBlocked) {
		t.Errorf("err = %v, want ErrBlocked", err)
	}
}

func TestSenderRejectsEmptyPayload(t *testing.T) {
	_, serverURL := newFakeTelegram(t)
	s := NewSender(newBot(t, serverURL), "https://radar.example")

	d := backend.Delivery{ID: "d-3", ChatID: 42, Kind: backend.DeliveryUrgent}
	if err := s.Send(context.Background(), d); err == nil {
		t.Error("want error for urgent delivery without insight")
	}
}

func newTestSender(t *testing.T, serverURL string) (*Sender, *[]time.Duration) {
	t.Helper()

	s := NewSender(newBot(t, serverURL), "https://radar.example")
	var sleeps []time.Duration
	s.sleep = func(_ context.Context, d time.Duration) error {
		sleeps = append(sleeps, d)
		return nil
	}
	s.limit.sleep = func(context.Context, time.Duration) error { return nil }
	return s, &sleeps
}

func TestSenderWaitsRetryAfterOnTooManyRequests(t *testing.T) {
	tg, serverURL := newFakeTelegram(t)
	tg.failures = []int{http.StatusTooManyRequests}
	s, sleeps := newTestSender(t, serverURL)

	if err := s.Send(context.Background(), urgentDelivery); err != nil {
		t.Fatal(err)
	}

	if tg.requests != 2 || len(tg.sent) != 1 {
		t.Errorf("requests = %d, sent = %d", tg.requests, len(tg.sent))
	}
	if !slices.Equal(*sleeps, []time.Duration{2 * time.Second}) {
		t.Errorf("sleeps = %v, want [2s]", *sleeps)
	}
}

func TestSenderGivesUpAfterRetries(t *testing.T) {
	tg, serverURL := newFakeTelegram(t)
	tg.errorCode = http.StatusBadGateway
	s, sleeps := newTestSender(t, serverURL)

	if err := s.Send(context.Background(), urgentDelivery); err == nil {
		t.Fatal("want error after retries")
	}

	if tg.requests != maxRetries+1 {
		t.Errorf("requests = %d, want %d", tg.requests, maxRetries+1)
	}
	want := []time.Duration{time.Second, 2 * time.Second, 4 * time.Second}
	if !slices.Equal(*sleeps, want) {
		t.Errorf("sleeps = %v, want %v", *sleeps, want)
	}
}

func TestSenderDoesNotRetryBadRequest(t *testing.T) {
	tg, serverURL := newFakeTelegram(t)
	tg.errorCode = http.StatusBadRequest
	s, _ := newTestSender(t, serverURL)

	if err := s.Send(context.Background(), urgentDelivery); err == nil {
		t.Fatal("want error")
	}
	if tg.requests != 1 {
		t.Errorf("requests = %d, want 1", tg.requests)
	}
}
