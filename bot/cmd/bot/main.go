package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/go-telegram/bot"

	"github.com/deylon999/radar-alphabank/bot/internal/backend"
	"github.com/deylon999/radar-alphabank/bot/internal/config"
	"github.com/deylon999/radar-alphabank/bot/internal/delivery"
	"github.com/deylon999/radar-alphabank/bot/internal/devapi"
	"github.com/deylon999/radar-alphabank/bot/internal/telegram"
)

func main() {
	if err := run(); err != nil {
		slog.Error("bot stopped", "err", err)
		os.Exit(1)
	}
}

func run() error {
	if err := config.LoadDotEnv(".env"); err != nil {
		return err
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	client := backend.NewFake(time.Now)
	handlers := telegram.NewHandlers(client, cfg.SiteURL, log)

	b, err := bot.New(cfg.BotToken, bot.WithDefaultHandler(handlers.Default))
	if err != nil {
		return err
	}
	handlers.Register(b)

	poller := delivery.NewPoller(client, telegram.NewSender(b, cfg.SiteURL), 10*time.Second, log)

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		poller.Run(ctx)
	}()

	if cfg.DevAddr != "" {
		dev := devapi.New(client, time.Now, log)
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := dev.ListenAndServe(ctx, cfg.DevAddr); err != nil {
				log.Error("dev api stopped", "err", err)
				stop()
			}
		}()
	}

	log.Info("bot started")
	b.Start(ctx)
	wg.Wait()
	log.Info("bot stopped")

	return nil
}
