package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func newRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CSRFOrigin([]string{"http://app.example", "https://app.example"}))
	r.GET("/", func(c *gin.Context) { c.String(200, "ok") })
	r.POST("/", func(c *gin.Context) { c.String(200, "ok") })
	return r
}

func TestCSRFAllowsGET(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("got %d", w.Code)
	}
}

func TestCSRFAllowsMatchingOrigin(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/", strings.NewReader("{}"))
	req.Header.Set("Origin", "http://app.example")
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("got %d", w.Code)
	}
}

func TestCSRFRejectsBadOrigin(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/", strings.NewReader("{}"))
	req.Header.Set("Origin", "http://evil.example")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("got %d", w.Code)
	}
}

func TestCSRFFallsBackToReferer(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/", strings.NewReader("{}"))
	req.Header.Set("Referer", "http://app.example/inbox")
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("got %d", w.Code)
	}
}

func TestCSRFRejectsMissing(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/", strings.NewReader("{}"))
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("got %d", w.Code)
	}
}
