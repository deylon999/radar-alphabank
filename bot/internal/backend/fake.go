package backend

import (
	"context"
	"fmt"
	"slices"
	"sync"
	"time"
)

var _ Client = (*Fake)(nil)

type Fake struct {
	mu     sync.Mutex
	now    func() time.Time
	codes  map[string]*fakeCode
	chats  map[int64]string
	status map[string]Status
	queue  []Delivery
	acked  map[string]AckStatus
	nextID int
}

type fakeCode struct {
	userID    string
	expiresAt time.Time
	used      bool
}

func NewFake(now func() time.Time) *Fake {
	return &Fake{
		now:   now,
		chats: map[int64]string{},
		acked: map[string]AckStatus{},
		codes: map[string]*fakeCode{
			"valid-code":   {userID: "u1", expiresAt: now().Add(15 * time.Minute)},
			"expired-code": {userID: "u1", expiresAt: now().Add(-time.Minute)},
			"used-code":    {userID: "u1", expiresAt: now().Add(15 * time.Minute), used: true},
		},
		status: map[string]Status{
			"u1": {
				CompanyName: "АО «Полевея Агро»",
				UrgentKinds: []string{"risk"},
				Digest:      "daily",
				DigestTime:  "09:00",
			},
		},
	}
}

func (f *Fake) ConfirmLink(_ context.Context, code string, chatID int64, _ string) (LinkResult, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	c, ok := f.codes[code]
	switch {
	case !ok:
		return LinkResult{}, ErrCodeNotFound
	case c.used:
		return LinkResult{}, ErrCodeUsed
	case f.now().After(c.expiresAt):
		return LinkResult{}, ErrCodeExpired
	}

	c.used = true
	f.chats[chatID] = c.userID
	return LinkResult{UserID: c.userID}, nil
}

func (f *Fake) Unlink(_ context.Context, chatID int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	delete(f.chats, chatID)
	return nil
}

func (f *Fake) Status(_ context.Context, chatID int64) (Status, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	userID, ok := f.chats[chatID]
	if !ok {
		return Status{}, ErrNotLinked
	}
	s := f.status[userID]
	s.Connected = true
	return s, nil
}

func (f *Fake) Deliveries(_ context.Context, limit int) ([]Delivery, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	var out []Delivery
	for _, d := range f.queue {
		if len(out) == limit {
			break
		}
		if _, done := f.acked[d.ID]; done {
			continue
		}
		if _, linked := f.chats[d.ChatID]; !linked {
			continue
		}
		out = append(out, d)
	}
	return out, nil
}

func (f *Fake) Ack(_ context.Context, deliveryID string, status AckStatus, _ string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	for _, d := range f.queue {
		if d.ID != deliveryID {
			continue
		}
		f.acked[deliveryID] = status
		if status == AckBlocked {
			delete(f.chats, d.ChatID)
		}
		return nil
	}
	return fmt.Errorf("delivery %q not found", deliveryID)
}

func (f *Fake) LinkedChats() []int64 {
	f.mu.Lock()
	defer f.mu.Unlock()

	ids := make([]int64, 0, len(f.chats))
	for id := range f.chats {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	return ids
}

func (f *Fake) Enqueue(d Delivery) Delivery {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.nextID++
	d.ID = fmt.Sprintf("d-%d", f.nextID)
	f.queue = append(f.queue, d)
	return d
}
