package apperror

import (
	"net/http"
	"testing"
)

func TestErrorString(t *testing.T) {
	e := BadRequest("missing field")
	if e.Code != "bad_request" {
		t.Fatalf("code=%s", e.Code)
	}
	if e.Status != http.StatusBadRequest {
		t.Fatalf("status=%d", e.Status)
	}
	if e.Error() != "bad_request: missing field" {
		t.Fatalf("Error()=%q", e.Error())
	}
}

func TestRateLimitedHint(t *testing.T) {
	e := RateLimited("slow down", "wait 60s")
	if e.Status != http.StatusTooManyRequests {
		t.Fatalf("status=%d", e.Status)
	}
	if e.Hint != "wait 60s" {
		t.Fatalf("hint=%s", e.Hint)
	}
}

func TestHelpersAssignStatuses(t *testing.T) {
	cases := []struct {
		err  *Error
		want int
	}{
		{Unauthorized("x"), http.StatusUnauthorized},
		{Forbidden("x"), http.StatusForbidden},
		{NotFound("x"), http.StatusNotFound},
		{Conflict("x"), http.StatusConflict},
		{Internal("x"), http.StatusInternalServerError},
	}
	for _, c := range cases {
		if c.err.Status != c.want {
			t.Errorf("%s: got %d want %d", c.err.Code, c.err.Status, c.want)
		}
	}
}
