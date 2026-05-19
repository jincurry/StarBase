package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func newSec(secure bool) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(SecurityHeaders(secure))
	r.GET("/", func(c *gin.Context) { c.String(200, "ok") })
	return r
}

func TestSecurityHeadersBaseline(t *testing.T) {
	r := newSec(false)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
	if w.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("missing X-Content-Type-Options")
	}
	if w.Header().Get("X-Frame-Options") != "DENY" {
		t.Fatal("missing X-Frame-Options")
	}
	if got := w.Header().Get("Referrer-Policy"); got == "" {
		t.Fatal("missing Referrer-Policy")
	}
	// HSTS must NOT be set when serving plain HTTP.
	if got := w.Header().Get("Strict-Transport-Security"); got != "" {
		t.Fatalf("HSTS leaked in non-secure mode: %q", got)
	}
}

func TestSecurityHeadersHSTSOnlyWhenSecure(t *testing.T) {
	r := newSec(true)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
	if got := w.Header().Get("Strict-Transport-Security"); got == "" {
		t.Fatal("HSTS should be set when secure=true")
	}
}
