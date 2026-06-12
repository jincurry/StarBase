package service

import (
	"sync"
	"time"

	"github.com/jincurry/starbase/internal/model"
)

// sessionCache is a short-TTL in-process cache in front of the sessions
// table. Every API request authenticates via cookie, so without this
// each page load costs 10+ identical session lookups.
//
// The TTL is deliberately tiny (30s): after logout-everywhere or
// account-disconnect the worst case is a 30-second window where an
// already-cached session still resolves — and by then the GitHub token
// is gone, so nothing sensitive works anyway. Logout through this
// process evicts immediately.
type sessionCache struct {
	mu         sync.Mutex
	ttl        time.Duration
	entries    map[string]sessionEntry
	maxEntries int
}

type sessionEntry struct {
	user    model.User
	expires time.Time
}

func newSessionCache(ttl time.Duration) *sessionCache {
	return &sessionCache{
		ttl:        ttl,
		entries:    map[string]sessionEntry{},
		maxEntries: 10_000,
	}
}

func (c *sessionCache) get(token string) (*model.User, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[token]
	if !ok || time.Now().After(e.expires) {
		return nil, false
	}
	u := e.user
	return &u, true
}

func (c *sessionCache) put(token string, u *model.User) {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.entries) >= c.maxEntries {
		// Cheap pressure valve: drop everything expired; if that wasn't
		// enough the cache simply resets. Sessions re-warm in one query.
		for k, e := range c.entries {
			if now.After(e.expires) {
				delete(c.entries, k)
			}
		}
		if len(c.entries) >= c.maxEntries {
			c.entries = map[string]sessionEntry{}
		}
	}
	c.entries[token] = sessionEntry{user: *u, expires: now.Add(c.ttl)}
}

func (c *sessionCache) evict(token string) {
	c.mu.Lock()
	delete(c.entries, token)
	c.mu.Unlock()
}
