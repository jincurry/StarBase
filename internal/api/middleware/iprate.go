package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// IPRateLimit is a rolling-window per-IP limiter for unauthenticated
// endpoints (the public share view). Same in-memory design as AIBudget:
// fine for single-replica; swap for Redis if you scale out.
type ipBudget struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

func newIPBudget(limit int, window time.Duration) *ipBudget {
	return &ipBudget{hits: map[string][]time.Time{}, limit: limit, window: window}
}

func (b *ipBudget) allow(ip string) bool {
	now := time.Now()
	cutoff := now.Add(-b.window)
	b.mu.Lock()
	defer b.mu.Unlock()
	// Opportunistic map-size guard: a scanner cycling IPs can't grow
	// this unbounded — when too many keys, drop the fully-expired ones.
	if len(b.hits) > 50_000 {
		for k, ts := range b.hits {
			if len(ts) == 0 || ts[len(ts)-1].Before(cutoff) {
				delete(b.hits, k)
			}
		}
	}
	hits := b.hits[ip]
	kept := hits[:0]
	for _, t := range hits {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= b.limit {
		b.hits[ip] = kept
		return false
	}
	b.hits[ip] = append(kept, now)
	return true
}

// IPRateLimit returns middleware enforcing `limit` requests per `window`
// per client IP.
func IPRateLimit(limit int, window time.Duration) gin.HandlerFunc {
	b := newIPBudget(limit, window)
	return func(c *gin.Context) {
		if !b.allow(c.ClientIP()) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"code":    "rate_limited",
				"message": "Too many requests — slow down",
			})
			return
		}
		c.Next()
	}
}
