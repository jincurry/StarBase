package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestBodyLimitAccepts(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(BodyLimit(100))
	r.POST("/", func(c *gin.Context) {
		b, _ := io.ReadAll(c.Request.Body)
		c.String(200, "got %d", len(b))
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/", strings.NewReader("hello"))
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
}

func TestBodyLimitRejects(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(BodyLimit(8))
	r.POST("/", func(c *gin.Context) {
		_, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.String(http.StatusRequestEntityTooLarge, "too big")
			return
		}
		c.Status(200)
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/", strings.NewReader("this body is larger than eight bytes"))
	r.ServeHTTP(w, req)
	if w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d", w.Code)
	}
}
