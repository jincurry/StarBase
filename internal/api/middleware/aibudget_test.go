package middleware

import (
	"testing"
	"time"
)

func TestAIBudgetAllowsUnderLimit(t *testing.T) {
	b := newAIBudget(3, time.Minute)
	for i := 0; i < 3; i++ {
		if !b.allow(7) {
			t.Fatalf("allow #%d should succeed", i)
		}
	}
	if b.allow(7) {
		t.Fatal("4th call should be blocked")
	}
}

func TestAIBudgetPerUserIsolation(t *testing.T) {
	b := newAIBudget(1, time.Minute)
	if !b.allow(1) {
		t.Fatal("user 1 first call denied")
	}
	if !b.allow(2) {
		t.Fatal("user 2 should have its own budget")
	}
}

func TestAIBudgetRolls(t *testing.T) {
	b := newAIBudget(1, 50*time.Millisecond)
	if !b.allow(1) {
		t.Fatal("first call denied")
	}
	if b.allow(1) {
		t.Fatal("second call within window should be denied")
	}
	time.Sleep(60 * time.Millisecond)
	if !b.allow(1) {
		t.Fatal("after window the budget should reset")
	}
}
