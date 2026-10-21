package backend

import (
	"context"
	"errors"
	"testing"
	"time"
)

func newTestFake() *Fake {
	now := time.Date(2026, 10, 18, 9, 0, 0, 0, time.UTC)
	return NewFake(func() time.Time { return now })
}

func TestFakeConfirmLink(t *testing.T) {
	tests := []struct {
		code string
		want error
	}{
		{"valid-code", nil},
		{"expired-code", ErrCodeExpired},
		{"used-code", ErrCodeUsed},
		{"nope", ErrCodeNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			f := newTestFake()
			_, err := f.ConfirmLink(context.Background(), tt.code, 42, "demo")
			if !errors.Is(err, tt.want) {
				t.Fatalf("ConfirmLink(%q) error = %v, want %v", tt.code, err, tt.want)
			}
		})
	}
}

func TestFakeCodeIsSingleUse(t *testing.T) {
	f := newTestFake()
	ctx := context.Background()

	if _, err := f.ConfirmLink(ctx, "valid-code", 42, "demo"); err != nil {
		t.Fatal(err)
	}
	if _, err := f.ConfirmLink(ctx, "valid-code", 43, "other"); !errors.Is(err, ErrCodeUsed) {
		t.Fatalf("second ConfirmLink error = %v, want %v", err, ErrCodeUsed)
	}
}

func TestFakeStatus(t *testing.T) {
	f := newTestFake()
	ctx := context.Background()

	if _, err := f.Status(ctx, 42); !errors.Is(err, ErrNotLinked) {
		t.Fatalf("Status before link error = %v, want %v", err, ErrNotLinked)
	}

	if _, err := f.ConfirmLink(ctx, "valid-code", 42, "demo"); err != nil {
		t.Fatal(err)
	}
	s, err := f.Status(ctx, 42)
	if err != nil {
		t.Fatal(err)
	}
	if !s.Connected || s.CompanyName == "" {
		t.Errorf("Status = %+v, want connected with company", s)
	}

	if err := f.Unlink(ctx, 42); err != nil {
		t.Fatal(err)
	}
	if _, err := f.Status(ctx, 42); !errors.Is(err, ErrNotLinked) {
		t.Fatalf("Status after unlink error = %v, want %v", err, ErrNotLinked)
	}
}

func TestFakeDeliveries(t *testing.T) {
	f := newTestFake()
	ctx := context.Background()

	if _, err := f.ConfirmLink(ctx, "valid-code", 42, "demo"); err != nil {
		t.Fatal(err)
	}
	first := f.Enqueue(Delivery{ChatID: 42, Kind: DeliveryUrgent, Insight: &Insight{ID: "agro-flood"}})
	f.Enqueue(Delivery{ChatID: 42, Kind: DeliveryDigest, Digest: &Digest{Risks: 5}})
	f.Enqueue(Delivery{ChatID: 99, Kind: DeliveryUrgent, Insight: &Insight{ID: "not-linked"}})

	got, err := f.Deliveries(ctx, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("Deliveries = %d items, want 2 for the linked chat", len(got))
	}

	if err := f.Ack(ctx, first.ID, AckSent, ""); err != nil {
		t.Fatal(err)
	}
	got, _ = f.Deliveries(ctx, 10)
	if len(got) != 1 || got[0].Kind != DeliveryDigest {
		t.Fatalf("after ack Deliveries = %+v, want only the digest", got)
	}

	if err := f.Ack(ctx, got[0].ID, AckBlocked, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := f.Status(ctx, 42); !errors.Is(err, ErrNotLinked) {
		t.Fatalf("blocked ack should unlink, Status error = %v", err)
	}
}
