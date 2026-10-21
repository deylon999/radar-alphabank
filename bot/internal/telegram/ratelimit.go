package telegram

import (
	"context"
	"sync"
	"time"
)

const (
	globalInterval  = time.Second / 30
	perChatInterval = time.Second
	maxTrackedChats = 1000
)

type limiter struct {
	mu    sync.Mutex
	now   func() time.Time
	sleep func(context.Context, time.Duration) error

	next     time.Time
	nextChat map[int64]time.Time
}

func newLimiter() *limiter {
	return &limiter{now: time.Now, sleep: sleep, nextChat: make(map[int64]time.Time)}
}

func (l *limiter) wait(ctx context.Context, chatID int64) error {
	l.mu.Lock()
	now := l.now()
	at := now
	if l.next.After(at) {
		at = l.next
	}
	if t := l.nextChat[chatID]; t.After(at) {
		at = t
	}
	l.next = at.Add(globalInterval)
	l.nextChat[chatID] = at.Add(perChatInterval)
	if len(l.nextChat) > maxTrackedChats {
		l.forget(now)
	}
	l.mu.Unlock()

	return l.sleep(ctx, at.Sub(now))
}

func (l *limiter) forget(now time.Time) {
	for id, t := range l.nextChat {
		if !t.After(now) {
			delete(l.nextChat, id)
		}
	}
}

func sleep(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return ctx.Err()
	}
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}
