package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/pkg/crypto"
)

const (
	RequestIDHeader = "X-Request-ID"
	ctxRequestID    = "starbase_request_id"
)

// RequestID assigns a short opaque ID to each request (or echoes a
// caller-supplied one) and surfaces it in the response header so logs
// can be cross-referenced with bug reports.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(RequestIDHeader)
		if id == "" {
			t, err := crypto.RandomToken(6) // 12-char hex
			if err == nil {
				id = t
			}
		}
		if id != "" {
			c.Header(RequestIDHeader, id)
			c.Set(ctxRequestID, id)
		}
		c.Next()
	}
}

// RequestIDFrom pulls the current request's id from gin context (if set).
func RequestIDFrom(c *gin.Context) string {
	if v, ok := c.Get(ctxRequestID); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// AccessLog emits one structured slog line per HTTP request once the
// handler chain has completed. Static `/healthz` calls are dropped at
// info level to keep logs scannable; everything else logs at info, and
// 5xx escalates to error.
func AccessLog(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		status := c.Writer.Status()
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}
		if path == "/healthz" && status < 400 {
			return
		}
		attrs := []any{
			"method", c.Request.Method,
			"path", path,
			"status", status,
			"latency_ms", time.Since(start).Milliseconds(),
			"ip", c.ClientIP(),
		}
		if rid := RequestIDFrom(c); rid != "" {
			attrs = append(attrs, "rid", rid)
		}
		if errs := c.Errors.String(); errs != "" {
			attrs = append(attrs, "errors", errs)
		}
		level := slog.LevelInfo
		if status >= 500 {
			level = slog.LevelError
		}
		log.LogAttrs(c.Request.Context(), level, "http", attrSlice(attrs)...)
	}
}

// attrSlice converts our flat []any of (key, value, key, value, …) into
// the []slog.Attr LogAttrs wants.
func attrSlice(kv []any) []slog.Attr {
	out := make([]slog.Attr, 0, len(kv)/2)
	for i := 0; i+1 < len(kv); i += 2 {
		k, _ := kv[i].(string)
		out = append(out, slog.Any(k, kv[i+1]))
	}
	return out
}
