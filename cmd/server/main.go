package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jincurry/starbase/internal/api"
	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/db"
	"github.com/jincurry/starbase/internal/github"
	"github.com/jincurry/starbase/internal/pkg/crypto"
	"github.com/jincurry/starbase/internal/service"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	pool, err := db.Open(ctx, cfg.DBURL)
	if err != nil {
		log.Error("db", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	aead, err := crypto.NewAEAD(cfg.TokenKey)
	if err != nil {
		log.Error("aead", "err", err)
		os.Exit(1)
	}

	// GITHUB_RATE_PER_SEC is a combined budget split between this process
	// and the worker (server: 25%, worker: 75%). Server-side calls are
	// limited to on-demand metadata refreshes + AI README fetches, so
	// the small share is plenty.
	gh := github.New(cfg.GitHubRatePerSec * 0.25)
	auth := service.NewAuth(cfg, pool, gh, aead)
	event := service.NewEvent(pool)
	syncSvc := service.NewSync(pool, gh, auth).WithEvents(event)
	star := service.NewStar(pool, gh, auth)
	tag := service.NewTag(pool)
	review := service.NewReview(pool, star)
	ai := service.NewAI(pool, gh, auth, cfg.AnthropicAPIKey, cfg.AnthropicModel)
	prefs := service.NewPreferences(pool)
	notif := service.NewNotifications(pool)
	account := service.NewAccount(pool)

	r := api.New(api.Deps{
		Cfg: cfg, DB: pool, Log: log,
		GH: gh, Auth: auth, Sync: syncSvc, Star: star,
		Tag: tag, Review: review, Event: event, AI: ai,
		Prefs: prefs, Notif: notif, Account: account,
	})

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}
	go func() {
		log.Info("server listening", "addr", cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("listen", "err", err)
			cancel()
		}
	}()

	<-ctx.Done()
	log.Info("shutting down")
	shutdownCtx, c2 := context.WithTimeout(context.Background(), 10*time.Second)
	defer c2()
	_ = srv.Shutdown(shutdownCtx)
}
