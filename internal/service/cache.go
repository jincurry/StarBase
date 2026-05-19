package service

import (
	"sort"
	"sync"
	"time"
)

// metaCache deduplicates background refresh calls within a short TTL.
// Bounded so a long-running process can't accumulate one entry per
// unique repo full_name ever seen — when the map fills past maxEntries
// we evict expired rows first, then the oldest remaining ones until
// we're back under the cap.
type metaCache struct {
	mu         sync.Mutex
	ttl        time.Duration
	hits       map[string]time.Time
	maxEntries int
}

func newMetaCache(ttl time.Duration) *metaCache {
	return &metaCache{
		ttl:        ttl,
		hits:       map[string]time.Time{},
		maxEntries: 10_000,
	}
}

// markIfFresh atomically returns false if the key was hit recently;
// otherwise it records a hit and returns true. Collapses the previous
// check-then-mark race so two concurrent calls only trigger one refresh.
func (c *metaCache) markIfFresh(key string) bool {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	if t, ok := c.hits[key]; ok && now.Sub(t) < c.ttl {
		return false
	}
	c.hits[key] = now
	if len(c.hits) > c.maxEntries {
		c.sweep(now)
	}
	return true
}

// sweep evicts expired entries; if still over the cap, drops the oldest
// remaining ones. Caller holds c.mu.
func (c *metaCache) sweep(now time.Time) {
	cutoff := now.Add(-c.ttl)
	for k, t := range c.hits {
		if t.Before(cutoff) {
			delete(c.hits, k)
		}
	}
	overflow := len(c.hits) - c.maxEntries
	if overflow <= 0 {
		return
	}
	type kt struct {
		k string
		t time.Time
	}
	all := make([]kt, 0, len(c.hits))
	for k, t := range c.hits {
		all = append(all, kt{k, t})
	}
	sort.Slice(all, func(i, j int) bool { return all[i].t.Before(all[j].t) })
	for i := 0; i < overflow; i++ {
		delete(c.hits, all[i].k)
	}
}
