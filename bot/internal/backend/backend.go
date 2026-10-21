package backend

import (
	"context"
	"errors"
	"time"
)

var (
	ErrCodeNotFound = errors.New("link code not found")
	ErrCodeExpired  = errors.New("link code expired")
	ErrCodeUsed     = errors.New("link code already used")
	ErrNotLinked    = errors.New("chat is not linked")
)

type Client interface {
	ConfirmLink(ctx context.Context, code string, chatID int64, username string) (LinkResult, error)
	Unlink(ctx context.Context, chatID int64) error
	Status(ctx context.Context, chatID int64) (Status, error)
	Deliveries(ctx context.Context, limit int) ([]Delivery, error)
	Ack(ctx context.Context, deliveryID string, status AckStatus, reason string) error
}

type LinkResult struct {
	UserID string `json:"userId"`
}

type Status struct {
	Connected   bool     `json:"connected"`
	CompanyName string   `json:"companyName"`
	UrgentKinds []string `json:"urgentKinds"`
	Digest      string   `json:"digest"`
	DigestTime  string   `json:"digestTime"`
}

type DeliveryKind string

const (
	DeliveryUrgent DeliveryKind = "urgent"
	DeliveryDigest DeliveryKind = "digest"
)

type Delivery struct {
	ID      string       `json:"id"`
	ChatID  int64        `json:"chatId"`
	Kind    DeliveryKind `json:"kind"`
	Insight *Insight     `json:"insight,omitempty"`
	Digest  *Digest      `json:"digest,omitempty"`
}

type Insight struct {
	ID           string   `json:"id"`
	Kind         string   `json:"kind"`
	Urgency      string   `json:"urgency"`
	Title        string   `json:"title"`
	WhyItMatters string   `json:"whyItMatters"`
	Checks       []string `json:"checks"`
}

type Digest struct {
	Since         time.Time `json:"since"`
	UrgentRisks   int       `json:"urgentRisks"`
	Risks         int       `json:"risks"`
	Opportunities int       `json:"opportunities"`
}

type AckStatus string

const (
	AckSent    AckStatus = "sent"
	AckBlocked AckStatus = "blocked"
	AckFailed  AckStatus = "failed"
)
