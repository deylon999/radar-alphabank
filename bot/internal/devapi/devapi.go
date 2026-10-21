package devapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

type Queue interface {
	LinkedChats() []int64
	Enqueue(d backend.Delivery) backend.Delivery
}

type Server struct {
	queue Queue
	now   func() time.Time
	log   *slog.Logger
}

func New(queue Queue, now func() time.Time, log *slog.Logger) *Server {
	return &Server{queue: queue, now: now, log: log}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /dev/deliveries", s.createDeliveries)
	return mux
}

func (s *Server) ListenAndServe(ctx context.Context, addr string) error {
	srv := &http.Server{Addr: addr, Handler: s.Handler(), ReadHeaderTimeout: 5 * time.Second}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	s.log.Info("dev api listening", "addr", addr)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func (s *Server) createDeliveries(w http.ResponseWriter, r *http.Request) {
	var req backend.Delivery
	err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req)
	if err != nil && !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "bad_request", "Не получилось прочитать JSON: "+err.Error())
		return
	}

	if req.Kind == "" {
		req.Kind = backend.DeliveryUrgent
	}
	switch req.Kind {
	case backend.DeliveryUrgent:
		if req.Insight == nil {
			req.Insight = demoInsight()
		}
	case backend.DeliveryDigest:
		if req.Digest == nil {
			req.Digest = s.demoDigest()
		}
	default:
		writeError(w, http.StatusBadRequest, "bad_kind", "kind должен быть urgent или digest")
		return
	}

	chats := []int64{req.ChatID}
	if req.ChatID == 0 {
		chats = s.queue.LinkedChats()
	}
	if len(chats) == 0 {
		writeError(w, http.StatusConflict, "no_linked_chats", "Сначала привяжите чат: откройте бота по ссылке ?start=valid-code")
		return
	}

	items := make([]backend.Delivery, 0, len(chats))
	for _, chatID := range chats {
		d := req
		d.ChatID = chatID
		items = append(items, s.queue.Enqueue(d))
	}
	s.log.Info("dev deliveries queued", "count", len(items), "kind", req.Kind)

	writeJSON(w, http.StatusCreated, map[string]any{"items": items})
}

func demoInsight() *backend.Insight {
	return &backend.Insight{
		ID:           "agro-flood",
		Kind:         "risk",
		Urgency:      "urgent",
		Title:        "Паводок в Заречном районе: вода подошла к складской зоне",
		WhyItMatters: "Склад «Южный-2» в зоне паводка — под угрозой поставка упаковки на маслозавод",
		Checks:       []string{"Запросить у склада статус отгрузки упаковки на сегодня и завтра"},
	}
}

func (s *Server) demoDigest() *backend.Digest {
	y, m, d := s.now().AddDate(0, 0, -7).Date()
	return &backend.Digest{
		Since:         time.Date(y, m, d, 0, 0, 0, 0, time.UTC),
		UrgentRisks:   1,
		Risks:         5,
		Opportunities: 3,
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]string{"code": code, "message": message})
}
