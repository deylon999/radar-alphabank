package telegram

import (
	"testing"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

func TestStatusText(t *testing.T) {
	tests := []struct {
		name string
		in   backend.Status
		want string
	}{
		{
			name: "daily",
			in: backend.Status{
				Connected:   true,
				CompanyName: "АО «Полевея Агро»",
				UrgentKinds: []string{"risk"},
				Digest:      "daily",
				DigestTime:  "09:00",
			},
			want: "Уведомления подключены: АО «Полевея Агро»\nСрочные: риски\nСводка: каждый день в 09:00",
		},
		{
			name: "weekly, both kinds",
			in: backend.Status{
				Connected:   true,
				UrgentKinds: []string{"risk", "opportunity"},
				Digest:      "weekly",
				DigestTime:  "18:30",
			},
			want: "Уведомления подключены\nСрочные: риски и возможности\nСводка: раз в неделю в 18:30",
		},
		{
			name: "everything off",
			in:   backend.Status{Connected: true, Digest: "off", DigestTime: "09:00"},
			want: "Уведомления подключены\nСрочные: не присылаю\nСводка: не присылаю",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := statusText(tt.in); got != tt.want {
				t.Errorf("got:\n%s\nwant:\n%s", got, tt.want)
			}
		})
	}
}
