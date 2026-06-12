package middleware

import (
	"testing"
	"time"
)

func TestIPBudgetAllowsUnderLimit(t *testing.T) {
	b := newIPBudget(3, time.Minute)
	for i := 0; i < 3; i++ {
		if !b.allow("1.2.3.4") {
			t.Fatalf("allow #%d should succeed", i)
		}
	}
	if b.allow("1.2.3.4") {
		t.Fatal("4th call should be blocked")
	}
}

func TestIPBudgetIsolatesIPs(t *testing.T) {
	b := newIPBudget(1, time.Minute)
	if !b.allow("a") {
		t.Fatal("first call denied")
	}
	if !b.allow("b") {
		t.Fatal("different IP should have its own budget")
	}
}

func TestIPBudgetWindow(t *testing.T) {
	b := newIPBudget(1, 30*time.Millisecond)
	b.allow("x")
	if b.allow("x") {
		t.Fatal("second call inside window should be denied")
	}
	time.Sleep(40 * time.Millisecond)
	if !b.allow("x") {
		t.Fatal("after window the budget should reset")
	}
}
