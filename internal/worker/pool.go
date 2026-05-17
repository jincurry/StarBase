package worker

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"

	"github.com/jincurry/starbase/internal/github"
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

// JobTimeout caps how long a single job is allowed to run before its
// context is cancelled. Long enough for a full initial sync of a normal
// power user, short enough that a graceful shutdown completes promptly.
const JobTimeout = 15 * time.Minute

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
		p.log.Info("running job", "worker", id, "id", job.ID, "type", job.JobType, "user", job.UserID, "attempt", job.Attempts)

		// Per-job context with timeout + parent cancellation chained
		// in so shutdown still preempts us.
		jobCtx, cancel := context.WithTimeout(ctx, JobTimeout)
		runErr := p.sync.Run(jobCtx, job)
		cancel()
		if runErr == nil {
			if err := p.sync.Finish(ctx, job.ID, service.JobDone, ""); err != nil {
				p.log.Error("finish job", "id", job.ID, "err", err)
			}
			continue
		}
		// Failure: schedule a retry with exponential backoff (up to maxAttempts).
		// Auth failures are non-retryable; bail immediately.
		const maxAttempts = 5
		if isFatal(runErr) {
			p.log.Error("job permanently failed", "id", job.ID, "err", runErr)
			_ = p.sync.Finish(ctx, job.ID, service.JobFailed, runErr.Error())
			continue
		}
		retried, err := p.sync.Reschedule(ctx, job.ID, job.Attempts, runErr.Error(), maxAttempts)
		if err != nil {
			p.log.Error("reschedule failed", "id", job.ID, "err", err)
		}
		if retried {
			p.log.Warn("job rescheduled", "id", job.ID, "attempt", job.Attempts, "err", runErr)
		} else {
			p.log.Error("job permanently failed (max attempts)", "id", job.ID, "err", runErr)
		}
	}
}

func isFatal(err error) bool {
	if err == nil {
		return false
	}
	// Token problems won't get better by retrying.
	if errors.Is(err, github.ErrUnauthorized) {
		return true
	}
	return false
}

func sleep(ctx context.Context, d time.Duration) {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
	case <-t.C:
	}
}
