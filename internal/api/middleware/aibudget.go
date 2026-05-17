package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/model"
)

// AIBudget enforces a per-user request budget on AI endpoints. The window
// rolls over every minute; calls beyond `limit` get 429.
//
// In-memory implementation — fine for single-replica deployments and the
// MVP "don't accidentally burn $50 of tokens" use case. Move to Redis if
// you ever run more than one server replica.
type aiBudget struct {
	mu      sync.Mutex
	hits    map[int64][]time.Time
	limit   int
	window  time.Duration
}

func newAIBudget(limit int, window time.Duration) *aiBudget {
	return &aiBudget{hits: map[int64][]time.Time{}, limit: limit, window: window}
}

func (b *aiBudget) allow(uid int64) bool {
	now := time.Now()
	cutoff := now.Add(-b.window)
	b.mu.Lock()
	defer b.mu.Unlock()
	hits := b.hits[uid]
	// Drop entries older than the window.
	kept := hits[:0]
	for _, t := range hits {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= b.limit {
		b.hits[uid] = kept
		return false
	}
	b.hits[uid] = append(kept, now)
	return true
}

// AIBudget returns middleware enforcing `limit` requests per `window` per user.
func AIBudget(limit int, window time.Duration) gin.HandlerFunc {
	b := newAIBudget(limit, window)
	return func(c *gin.Context) {
		u, ok := c.Get(CtxUserKey)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": "unauthorized", "message": "auth required"})
			return
		}
		if !b.allow(u.(*model.User).ID) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"code":    "ai_budget_exceeded",
				"message": "AI usage limit reached — try again in a minute",
			})
			return
		}
		c.Next()
	}
}
