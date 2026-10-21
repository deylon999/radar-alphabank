package devapi

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

var now = time.Date(2026, time.October, 18, 15, 0, 0, 0, time.UTC)

func newServer(t *testing.T, linked ...int64) (*backend.Fake, http.Handler) {
	t.Helper()

	fake := backend.NewFake(func() time.Time { return now })
	for _, chatID := range linked {
		if _, err := fake.ConfirmLink(context.Background(), "valid-code", chatID, ""); err != nil {
			t.Fatal(err)
		}
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	return fake, New(fake, func() time.Time { return now }, log).Handler()
}

func post(h http.Handler, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/dev/deliveries", strings.NewReader(body)))
	return rec
}

func TestEmptyBodyQueuesDemoInsightForLinkedChat(t *testing.T) {
	fake, h := newServer(t, 42)

	rec := post(h, "")
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}

	items, _ := fake.Deliveries(context.Background(), 10)
	if len(items) != 1 {
		t.Fatalf("queued %d deliveries, want 1", len(items))
	}
	d := items[0]
	if d.ChatID != 42 || d.Kind != backend.DeliveryUrgent || d.Insight == nil || d.Insight.ID != "agro-flood" {
		t.Errorf("unexpected delivery %+v", d)
	}
}

func TestDigestUsesWeekAgo(t *testing.T) {
	fake, h := newServer(t, 42)

	if rec := post(h, `{"kind":"digest"}`); rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}

	items, _ := fake.Deliveries(context.Background(), 10)
	if len(items) != 1 || items[0].Digest == nil {
		t.Fatalf("unexpected deliveries %+v", items)
	}
	if want := time.Date(2026, time.October, 11, 0, 0, 0, 0, time.UTC); !items[0].Digest.Since.Equal(want) {
		t.Errorf("since = %v, want %v", items[0].Digest.Since, want)
	}
}

func TestCustomInsight(t *testing.T) {
	fake, h := newServer(t, 42)

	rec := post(h, `{"insight":{"id":"tender","kind":"opportunity","urgency":"urgent","title":"Тендер на поставку"}}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}

	items, _ := fake.Deliveries(context.Background(), 10)
	if len(items) != 1 || items[0].Insight.Title != "Тендер на поставку" {
		t.Errorf("unexpected deliveries %+v", items)
	}
}

func TestErrors(t *testing.T) {
	tests := []struct {
		name   string
		linked []int64
		body   string
		status int
		code   string
	}{
		{"no linked chats", nil, "", http.StatusConflict, "no_linked_chats"},
		{"broken json", []int64{42}, "{", http.StatusBadRequest, "bad_request"},
		{"unknown kind", []int64{42}, `{"kind":"weekly"}`, http.StatusBadRequest, "bad_kind"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, h := newServer(t, tt.linked...)

			rec := post(h, tt.body)

			var body struct{ Code string }
			_ = json.Unmarshal(rec.Body.Bytes(), &body)
			if rec.Code != tt.status || body.Code != tt.code {
				t.Errorf("got %d %q, want %d %q", rec.Code, body.Code, tt.status, tt.code)
			}
		})
	}
}
