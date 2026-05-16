package service

import (
	"sync"
	"time"
)

type metaCache struct {
	mu   sync.Mutex
	ttl  time.Duration
	hits map[string]time.Time
}

func newMetaCache(ttl time.Duration) *metaCache {
	return &metaCache{ttl: ttl, hits: map[string]time.Time{}}
}

func (c *metaCache) seenRecently(key string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	t, ok := c.hits[key]
	return ok && time.Since(t) < c.ttl
}

func (c *metaCache) mark(key string) {
	c.mu.Lock()
	c.hits[key] = time.Now()
	c.mu.Unlock()
}
