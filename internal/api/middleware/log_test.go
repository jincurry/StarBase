package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestIDIsGenerated(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestID())
	r.GET("/", func(c *gin.Context) { c.String(200, "ok") })
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
	if w.Header().Get(RequestIDHeader) == "" {
		t.Fatal("expected X-Request-ID header")
	}
}

func TestRequestIDEchoesCaller(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestID())
	r.GET("/", func(c *gin.Context) {
		if RequestIDFrom(c) != "abc-xyz" {
			t.Fatalf("RequestIDFrom: %q", RequestIDFrom(c))
		}
	})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(RequestIDHeader, "abc-xyz")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Header().Get(RequestIDHeader) != "abc-xyz" {
		t.Fatalf("response header should echo caller's id, got %q", w.Header().Get(RequestIDHeader))
	}
}
