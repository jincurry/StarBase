package service

import (
	"strconv"
	"testing"
	"time"
)

func TestMetaCacheDedup(t *testing.T) {
	c := newMetaCache(time.Hour)
	if !c.markIfFresh("a") {
		t.Fatal("first mark should be true")
	}
	if c.markIfFresh("a") {
		t.Fatal("second mark within TTL should be false")
	}
}

func TestMetaCacheExpires(t *testing.T) {
	c := newMetaCache(20 * time.Millisecond)
	c.markIfFresh("a")
	time.Sleep(30 * time.Millisecond)
	if !c.markIfFresh("a") {
		t.Fatal("after TTL the entry should be considered fresh again")
	}
}

func TestMetaCacheBounded(t *testing.T) {
	c := newMetaCache(time.Hour)
	c.maxEntries = 50 // shrink for the test
	for i := 0; i < 200; i++ {
		c.markIfFresh("k" + strconv.Itoa(i))
	}
	if got := len(c.hits); got > c.maxEntries {
		t.Fatalf("len=%d exceeds cap %d", got, c.maxEntries)
	}
	// The newest 50 entries should still be present (LRU keeps recent).
	if c.markIfFresh("k199") {
		t.Fatal("most-recent key should still be cached")
	}
}
