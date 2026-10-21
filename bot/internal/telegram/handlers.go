package telegram

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
)

const helpText = `Я присылаю срочные инсайты «Радара» и сводку по расписанию.

/start — подключить уведомления
/status — что сейчас присылаю
/stop — отключить уведомления
/help — эта справка`

type Handlers struct {
	backend backend.Client
	siteURL string
	log     *slog.Logger
}

func NewHandlers(client backend.Client, siteURL string, log *slog.Logger) *Handlers {
	return &Handlers{backend: client, siteURL: siteURL, log: log}
}

func (h *Handlers) Register(b *bot.Bot) {
	b.RegisterHandler(bot.HandlerTypeMessageText, "start", bot.MatchTypeCommandStartOnly, h.start)
	b.RegisterHandler(bot.HandlerTypeMessageText, "status", bot.MatchTypeCommandStartOnly, h.status)
	b.RegisterHandler(bot.HandlerTypeMessageText, "stop", bot.MatchTypeCommandStartOnly, h.stop)
	b.RegisterHandler(bot.HandlerTypeMessageText, "help", bot.MatchTypeCommandStartOnly, h.help)
}

func (h *Handlers) Default(ctx context.Context, b *bot.Bot, update *models.Update) {
	if update.Message == nil {
		return
	}
	h.reply(ctx, b, update.Message.Chat.ID, "Не понял команду. Список команд — /help")
}

func (h *Handlers) start(ctx context.Context, b *bot.Bot, update *models.Update) {
	chatID := update.Message.Chat.ID

	code := startPayload(update.Message.Text)
	if code == "" {
		h.reply(ctx, b, chatID, h.connectHint())
		return
	}

	var username string
	if update.Message.From != nil {
		username = update.Message.From.Username
	}

	_, err := h.backend.ConfirmLink(ctx, code, chatID, username)
	if err != nil {
		h.log.Warn("confirm link", "chat_id", chatID, "err", err)
	} else {
		h.log.Info("chat linked", "chat_id", chatID)
	}
	h.reply(ctx, b, chatID, linkReply(err))
}

func (h *Handlers) status(ctx context.Context, b *bot.Bot, update *models.Update) {
	chatID := update.Message.Chat.ID

	st, err := h.backend.Status(ctx, chatID)
	switch {
	case errors.Is(err, backend.ErrNotLinked):
		h.reply(ctx, b, chatID, h.connectHint())
	case err != nil:
		h.log.Error("get status", "chat_id", chatID, "err", err)
		h.reply(ctx, b, chatID, "Не получилось узнать настройки. Попробуйте позже")
	default:
		h.reply(ctx, b, chatID, statusText(st)+"\n\nИзменить: "+h.settingsURL())
	}
}

func (h *Handlers) stop(ctx context.Context, b *bot.Bot, update *models.Update) {
	chatID := update.Message.Chat.ID

	if err := h.backend.Unlink(ctx, chatID); err != nil {
		h.log.Error("unlink", "chat_id", chatID, "err", err)
		h.reply(ctx, b, chatID, "Не получилось отключить уведомления. Попробуйте позже")
		return
	}
	h.log.Info("chat unlinked", "chat_id", chatID)
	h.reply(ctx, b, chatID, "Уведомления отключены. Подключить снова можно на сайте: "+h.settingsURL())
}

func (h *Handlers) help(ctx context.Context, b *bot.Bot, update *models.Update) {
	h.reply(ctx, b, update.Message.Chat.ID, helpText)
}

func (h *Handlers) reply(ctx context.Context, b *bot.Bot, chatID int64, text string) {
	_, err := b.SendMessage(ctx, &bot.SendMessageParams{ChatID: chatID, Text: text})
	if err != nil {
		h.log.Error("send message", "chat_id", chatID, "err", err)
	}
}

func (h *Handlers) settingsURL() string {
	return h.siteURL + "/notifications"
}

func (h *Handlers) connectHint() string {
	return "Чтобы получать уведомления, нажмите «Подключить Telegram» на сайте: " + h.settingsURL()
}

func startPayload(text string) string {
	_, payload, _ := strings.Cut(strings.TrimSpace(text), " ")
	return strings.TrimSpace(payload)
}

func linkReply(err error) string {
	switch {
	case err == nil:
		return "Готово. Срочные инсайты будут приходить сюда"
	case errors.Is(err, backend.ErrCodeExpired):
		return "Ссылка устарела. Нажмите «Подключить Telegram» ещё раз"
	case errors.Is(err, backend.ErrCodeUsed):
		return "Эта ссылка уже использована"
	case errors.Is(err, backend.ErrCodeNotFound):
		return "Ссылка не подходит. Откройте её заново на сайте"
	default:
		return "Не получилось подключить уведомления. Попробуйте позже"
	}
}
