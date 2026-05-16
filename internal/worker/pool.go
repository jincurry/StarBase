package worker

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/jincurry/starbase/internal/service"
)

type Pool struct {
	sync    *service.SyncService
	workers int
	log     *slog.Logger
}

func New(sync *service.SyncService, workers int, log *slog.Logger) *Pool {
	if workers <= 0 {
		workers = 1
	}
	return &Pool{sync: sync, workers: workers, log: log}
}

func (p *Pool) Run(ctx context.Context) error {
	var wg sync.WaitGroup
	for i := 0; i < p.workers; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			p.loop(ctx, id)
		}(i)
	}
	wg.Wait()
	return nil
}

func (p *Pool) loop(ctx context.Context, id int) {
	backoff := time.Second
	for {
		if ctx.Err() != nil {
			return
		}
		job, err := p.sync.Claim(ctx)
		if err != nil {
			p.log.Error("claim job", "worker", id, "err", err)
			sleep(ctx, backoff)
			continue
		}
		if job == nil {
			sleep(ctx, 2*time.Second)
			continue
		}
		p.log.Info("running job", "worker", id, "id", job.ID, "type", job.JobType, "user", job.UserID)
		runErr := p.sync.Run(ctx, job)
		final := service.JobDone
		msg := ""
		if runErr != nil {
			final = service.JobFailed
			msg = runErr.Error()
			p.log.Error("job failed", "id", job.ID, "err", runErr)
		}
		if err := p.sync.Finish(ctx, job.ID, final, msg); err != nil {
			p.log.Error("finish job", "id", job.ID, "err", err)
		}
	}
}

func sleep(ctx context.Context, d time.Duration) {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
	case <-t.C:
	}
}
