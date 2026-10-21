package telegram

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"

	"github.com/go-telegram/bot"
)

type fakeTelegram struct {
	mu        sync.Mutex
	sent      []url.Values
	requests  int
	errorCode int
	failures  []int
}

func (f *fakeTelegram) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.requests++
	code := f.errorCode
	if len(f.failures) > 0 {
		code, f.failures = f.failures[0], f.failures[1:]
	}
	if code != 0 {
		w.WriteHeader(code)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":          false,
			"error_code":  code,
			"description": http.StatusText(code),
			"parameters":  map[string]any{"retry_after": 2},
		})
		return
	}
	if strings.HasSuffix(r.URL.Path, "/sendMessage") {
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		f.sent = append(f.sent, r.MultipartForm.Value)
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "result": map[string]any{}})
}

func (f *fakeTelegram) last(t *testing.T) url.Values {
	t.Helper()
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.sent) == 0 {
		t.Fatal("bot sent nothing")
	}
	return f.sent[len(f.sent)-1]
}

func newFakeTelegram(t *testing.T) (*fakeTelegram, string) {
	t.Helper()
	tg := &fakeTelegram{}
	srv := httptest.NewServer(tg)
	t.Cleanup(srv.Close)
	return tg, srv.URL
}

func newBot(t *testing.T, serverURL string, opts ...bot.Option) *bot.Bot {
	t.Helper()
	opts = append([]bot.Option{bot.WithServerURL(serverURL), bot.WithSkipGetMe()}, opts...)
	b, err := bot.New("test:token", opts...)
	if err != nil {
		t.Fatal(err)
	}
	return b
}
