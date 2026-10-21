package delivery

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

const chatID = 42

type fakeSender struct {
	sent []string
	errs map[string]error
}

func (s *fakeSender) Send(_ context.Context, d backend.Delivery) error {
	s.sent = append(s.sent, d.ID)
	return s.errs[d.ID]
}

type ack struct {
	id     string
	status backend.AckStatus
}

type recordingClient struct {
	backend.Client
	acks     []ack
	failAcks int
}

func (c *recordingClient) Ack(ctx context.Context, id string, status backend.AckStatus, reason string) error {
	if c.failAcks > 0 {
		c.failAcks--
		return errors.New("backend unavailable")
	}
	c.acks = append(c.acks, ack{id, status})
	return c.Client.Ack(ctx, id, status, reason)
}

func setup(t *testing.T) (*backend.Fake, *recordingClient, *fakeSender, *Poller) {
	t.Helper()

	fake := backend.NewFake(time.Now)
	if _, err := fake.ConfirmLink(context.Background(), "valid-code", chatID, ""); err != nil {
		t.Fatal(err)
	}
	client := &recordingClient{Client: fake}
	sender := &fakeSender{errs: map[string]error{}}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	return fake, client, sender, NewPoller(client, sender, time.Second, log)
}

func urgent(fake *backend.Fake) backend.Delivery {
	return fake.Enqueue(backend.Delivery{
		ChatID:  chatID,
		Kind:    backend.DeliveryUrgent,
		Insight: &backend.Insight{ID: "agro-flood", Title: "Паводок"},
	})
}

func TestPollSendsAndAcks(t *testing.T) {
	fake, client, sender, p := setup(t)
	d1, d2 := urgent(fake), urgent(fake)

	p.Poll(context.Background())
	p.Poll(context.Background())

	if fmt.Sprint(sender.sent) != fmt.Sprint([]string{d1.ID, d2.ID}) {
		t.Errorf("sent = %v", sender.sent)
	}
	want := []ack{{d1.ID, backend.AckSent}, {d2.ID, backend.AckSent}}
	if fmt.Sprint(client.acks) != fmt.Sprint(want) {
		t.Errorf("acks = %v, want %v", client.acks, want)
	}
}

func TestPollReportsBlockedAndFailed(t *testing.T) {
	fake, client, sender, p := setup(t)
	failed, blocked := urgent(fake), urgent(fake)
	sender.errs[failed.ID] = errors.New("bad request")
	sender.errs[blocked.ID] = fmt.Errorf("%w: forbidden", ErrBlocked)

	p.Poll(context.Background())

	want := []ack{{failed.ID, backend.AckFailed}, {blocked.ID, backend.AckBlocked}}
	if fmt.Sprint(client.acks) != fmt.Sprint(want) {
		t.Errorf("acks = %v, want %v", client.acks, want)
	}
	if _, err := fake.Status(context.Background(), chatID); !errors.Is(err, backend.ErrNotLinked) {
		t.Errorf("chat should be unlinked after block, got err = %v", err)
	}
}

func TestPollDoesNotResendWhenAckFailed(t *testing.T) {
	fake, client, sender, p := setup(t)
	d := urgent(fake)
	client.failAcks = 1

	p.Poll(context.Background())
	p.Poll(context.Background())

	if len(sender.sent) != 1 {
		t.Errorf("sent %d times, want once", len(sender.sent))
	}
	if want := []ack{{d.ID, backend.AckSent}}; fmt.Sprint(client.acks) != fmt.Sprint(want) {
		t.Errorf("acks = %v, want %v", client.acks, want)
	}
}
