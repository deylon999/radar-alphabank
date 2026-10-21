package delivery

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

const batchSize = 50

var ErrBlocked = errors.New("bot blocked by user")

type Sender interface {
	Send(ctx context.Context, d backend.Delivery) error
}

type result struct {
	status backend.AckStatus
	reason string
}

type Poller struct {
	client   backend.Client
	sender   Sender
	interval time.Duration
	log      *slog.Logger

	unacked map[string]result
}

func NewPoller(client backend.Client, sender Sender, interval time.Duration, log *slog.Logger) *Poller {
	return &Poller{
		client:   client,
		sender:   sender,
		interval: interval,
		log:      log,
		unacked:  make(map[string]result),
	}
}

func (p *Poller) Run(ctx context.Context) {
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		p.Poll(ctx)

		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (p *Poller) Poll(ctx context.Context) {
	items, err := p.client.Deliveries(ctx, batchSize)
	if err != nil {
		if ctx.Err() == nil {
			p.log.Error("fetch deliveries", "err", err)
		}
		return
	}

	for _, d := range items {
		if ctx.Err() != nil {
			return
		}

		res, ok := p.unacked[d.ID]
		if !ok {
			res = p.deliver(ctx, d)
		}
		p.ack(ctx, d.ID, res)
	}
}

func (p *Poller) deliver(ctx context.Context, d backend.Delivery) result {
	err := p.sender.Send(ctx, d)
	switch {
	case err == nil:
		p.log.Info("delivered", "id", d.ID, "chat_id", d.ChatID, "kind", d.Kind)
		return result{status: backend.AckSent}
	case errors.Is(err, ErrBlocked):
		p.log.Info("chat blocked the bot", "id", d.ID, "chat_id", d.ChatID)
		return result{status: backend.AckBlocked}
	default:
		p.log.Warn("delivery failed", "id", d.ID, "chat_id", d.ChatID, "err", err)
		return result{status: backend.AckFailed, reason: err.Error()}
	}
}

func (p *Poller) ack(ctx context.Context, id string, res result) {
	if err := p.client.Ack(ctx, id, res.status, res.reason); err != nil {
		p.log.Error("ack delivery", "id", id, "status", res.status, "err", err)
		p.unacked[id] = res
		return
	}
	delete(p.unacked, id)
}
