package telegram

import (
	"context"
	"slices"
	"testing"
	"time"
)

type clock struct {
	now    time.Time
	sleeps []time.Duration
}

func (c *clock) limiter() *limiter {
	l := newLimiter()
	l.now = func() time.Time { return c.now }
	l.sleep = func(_ context.Context, d time.Duration) error {
		c.sleeps = append(c.sleeps, d)
		return nil
	}
	return l
}

func TestLimiterSpacesMessagesToOneChat(t *testing.T) {
	c := &clock{now: time.Unix(0, 0)}
	l := c.limiter()

	for range 3 {
		if err := l.wait(context.Background(), 42); err != nil {
			t.Fatal(err)
		}
	}

	if want := []time.Duration{0, time.Second, 2 * time.Second}; !slices.Equal(c.sleeps, want) {
		t.Errorf("sleeps = %v, want %v", c.sleeps, want)
	}
}

func TestLimiterKeepsGlobalPace(t *testing.T) {
	c := &clock{now: time.Unix(0, 0)}
	l := c.limiter()

	for chatID := range int64(31) {
		_ = l.wait(context.Background(), chatID)
	}

	if got := c.sleeps[30]; got != 30*globalInterval {
		t.Errorf("31st message waits %v, want %v", got, 30*globalInterval)
	}
}

func TestLimiterForgetsIdleChats(t *testing.T) {
	c := &clock{now: time.Unix(0, 0)}
	l := c.limiter()

	for chatID := range int64(maxTrackedChats) {
		_ = l.wait(context.Background(), chatID)
	}
	c.now = c.now.Add(time.Hour)
	_ = l.wait(context.Background(), -1)

	if len(l.nextChat) != 1 {
		t.Errorf("tracked %d chats, want 1", len(l.nextChat))
	}
}
