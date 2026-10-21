package telegram

import (
	"testing"
	"time"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

const site = "https://radar.example"

func TestUrgentMessage(t *testing.T) {
	msg := urgentMessage(site, backend.Insight{
		ID:           "agro-flood",
		Kind:         "risk",
		Urgency:      "urgent",
		Title:        "Паводок в Заречном районе: вода подошла к складу <Южный-2>",
		WhyItMatters: "Под угрозой поставка упаковки на маслозавод",
		Checks:       []string{"Запросить у склада статус отгрузки", "Найти запасного поставщика"},
	})

	want := "Радар · Срочно · Риск\n\n" +
		"<b>Паводок в Заречном районе: вода подошла к складу &lt;Южный-2&gt;</b>\n\n" +
		"Под угрозой поставка упаковки на маслозавод\n\n" +
		"Что проверить: Запросить у склада статус отгрузки"
	if msg.text != want {
		t.Errorf("text:\n%s\nwant:\n%s", msg.text, want)
	}
	if msg.linkURL != site+"/insights/agro-flood" {
		t.Errorf("linkURL = %q", msg.linkURL)
	}
}

func TestUrgentMessageWithoutOptionalParts(t *testing.T) {
	msg := urgentMessage(site, backend.Insight{ID: "x", Kind: "opportunity", Title: "Тендер"})

	want := "Радар · Возможность\n\n<b>Тендер</b>"
	if msg.text != want {
		t.Errorf("text:\n%s\nwant:\n%s", msg.text, want)
	}
}

func TestDigestMessage(t *testing.T) {
	since := time.Date(2026, time.October, 11, 0, 0, 0, 0, time.UTC)
	tests := []struct {
		name string
		in   backend.Digest
		want string
	}{
		{
			name: "all counters",
			in:   backend.Digest{Since: since, UrgentRisks: 1, Risks: 5, Opportunities: 3},
			want: "Радар · Сводка\n\nС 11 октября: 1 срочный риск · 5 рисков · 3 возможности",
		},
		{
			name: "zeros skipped",
			in:   backend.Digest{Since: since, Risks: 2},
			want: "Радар · Сводка\n\nС 11 октября: 2 риска",
		},
		{
			name: "empty",
			in:   backend.Digest{Since: since},
			want: "Радар · Сводка\n\nС 11 октября новых инсайтов нет",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := digestMessage(site, tt.in).text; got != tt.want {
				t.Errorf("got:\n%s\nwant:\n%s", got, tt.want)
			}
		})
	}
}

func TestPlural(t *testing.T) {
	tests := map[int]string{
		0:   "0 рисков",
		1:   "1 риск",
		2:   "2 риска",
		5:   "5 рисков",
		11:  "11 рисков",
		12:  "12 рисков",
		21:  "21 риск",
		22:  "22 риска",
		111: "111 рисков",
	}
	for n, want := range tests {
		if got := plural(n, "риск", "риска", "рисков"); got != want {
			t.Errorf("plural(%d) = %q, want %q", n, got, want)
		}
	}
}
