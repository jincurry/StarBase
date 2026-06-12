package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/db"
	"github.com/jincurry/starbase/internal/github"
	"github.com/jincurry/starbase/internal/pkg/crypto"
	"github.com/jincurry/starbase/internal/service"
	"github.com/jincurry/starbase/internal/worker"
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
	// Worker takes 75% of the GITHUB_RATE_PER_SEC budget; the server
	// uses the other 25% for on-demand metadata refreshes.
	gh := github.New(cfg.GitHubRatePerSec * 0.75)
	auth := service.NewAuth(cfg, pool, gh, aead)
	event := service.NewEvent(pool)
	syncSvc := service.NewSync(pool, gh, auth).WithEvents(event)
	notif := service.NewNotifications(pool)
	keep := service.NewHousekeeping(pool)

	sched := worker.NewScheduler(pool, syncSvc, notif, keep, log)
	sched.Run(ctx)

	p := worker.New(syncSvc, cfg.WorkerConcurrency, log)
	log.Info("worker pool running",
		"concurrency", cfg.WorkerConcurrency,
		"auto_incremental", sched.IncrementalInterval,
		"auto_reconcile", sched.ReconcileInterval,
	)
	_ = p.Run(ctx)
}
