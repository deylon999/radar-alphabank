package telegram

import (
	"strings"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

var kindLabels = map[string]string{
	"risk":        "риски",
	"opportunity": "возможности",
}

func statusText(s backend.Status) string {
	var sb strings.Builder

	sb.WriteString("Уведомления подключены")
	if s.CompanyName != "" {
		sb.WriteString(": " + s.CompanyName)
	}

	sb.WriteString("\nСрочные: ")
	if len(s.UrgentKinds) == 0 {
		sb.WriteString("не присылаю")
	} else {
		kinds := make([]string, 0, len(s.UrgentKinds))
		for _, k := range s.UrgentKinds {
			if label, ok := kindLabels[k]; ok {
				kinds = append(kinds, label)
			} else {
				kinds = append(kinds, k)
			}
		}
		sb.WriteString(strings.Join(kinds, " и "))
	}

	sb.WriteString("\nСводка: ")
	switch s.Digest {
	case "daily":
		sb.WriteString("каждый день")
	case "weekly":
		sb.WriteString("раз в неделю")
	default:
		sb.WriteString("не присылаю")
		return sb.String()
	}
	if s.DigestTime != "" {
		sb.WriteString(" в " + s.DigestTime)
	}

	return sb.String()
}
