package telegram

import (
	"fmt"
	"html"
	"strings"
	"time"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

type message struct {
	text      string
	linkLabel string
	linkURL   string
}

var (
	urgencyLabels = map[string]string{
		"urgent":    "Срочно",
		"important": "Важно",
		"info":      "К сведению",
	}
	insightKindLabels = map[string]string{
		"risk":        "Риск",
		"opportunity": "Возможность",
	}
	monthsGenitive = [...]string{
		"января", "февраля", "марта", "апреля", "мая", "июня",
		"июля", "августа", "сентября", "октября", "ноября", "декабря",
	}
)

func urgentMessage(siteURL string, in backend.Insight) message {
	meta := []string{"Радар"}
	for _, label := range []string{urgencyLabels[in.Urgency], insightKindLabels[in.Kind]} {
		if label != "" {
			meta = append(meta, label)
		}
	}

	lines := []string{
		strings.Join(meta, " · "),
		"<b>" + html.EscapeString(in.Title) + "</b>",
	}
	if in.WhyItMatters != "" {
		lines = append(lines, html.EscapeString(in.WhyItMatters))
	}
	if len(in.Checks) > 0 {
		lines = append(lines, "Что проверить: "+html.EscapeString(in.Checks[0]))
	}

	return message{
		text:      strings.Join(lines, "\n\n"),
		linkLabel: "Открыть в Радаре",
		linkURL:   siteURL + "/insights/" + in.ID,
	}
}

func digestMessage(siteURL string, d backend.Digest) message {
	var parts []string
	if d.UrgentRisks > 0 {
		parts = append(parts, plural(d.UrgentRisks, "срочный риск", "срочных риска", "срочных рисков"))
	}
	if d.Risks > 0 {
		parts = append(parts, plural(d.Risks, "риск", "риска", "рисков"))
	}
	if d.Opportunities > 0 {
		parts = append(parts, plural(d.Opportunities, "возможность", "возможности", "возможностей"))
	}

	since := "С " + formatDay(d.Since)
	text := since + " новых инсайтов нет"
	if len(parts) > 0 {
		text = since + ": " + strings.Join(parts, " · ")
	}

	return message{
		text:      "Радар · Сводка\n\n" + text,
		linkLabel: "Открыть ленту",
		linkURL:   siteURL + "/",
	}
}

func formatDay(t time.Time) string {
	return fmt.Sprintf("%d %s", t.Day(), monthsGenitive[t.Month()-1])
}

func plural(n int, one, few, many string) string {
	form := many
	switch n10, n100 := n%10, n%100; {
	case n10 == 1 && n100 != 11:
		form = one
	case n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14):
		form = few
	}
	return fmt.Sprintf("%d %s", n, form)
}
